import { z } from "zod";

import { createLimiter, type Limiter } from "./limiter.js";

export type Region = "west" | "europe" | "east";

export interface AodpClientOptions {
  region?: Region;
}

export interface BatchFailure {
  itemIds: string[];
  error: Error;
}

export type AodpEvent =
  | { type: "progress"; done: number; total: number }
  | { type: "waiting"; seconds: number }
  | ({ type: "error" } & BatchFailure);

export interface GetPricesOptions {
  onEvent?: (event: AodpEvent) => void;
}

export interface FetchedPrices {
  prices: AodpPrice[];
  failures: BatchFailure[];
}

export interface AodpClient {
  readonly region: Region;
  getPrices(
    itemIds: readonly string[],
    locations: readonly string[],
    qualities: readonly number[],
    options?: GetPricesOptions,
  ): Promise<FetchedPrices>;
}

const MAX_URL_LENGTH = 4096;
const MAX_ATTEMPTS = 3;
const FIRST_BACKOFF_MS = 1000;
const MINUTE_MS = 60_000;
const CLOCK_MARGIN_MS = 1000;

const date = z.iso.datetime({ local: true });

const pricesSchema = z.array(
  z.object({
    item_id: z.string(),
    city: z.string(),
    quality: z.int(),
    sell_price_min: z.number(),
    sell_price_min_date: date,
    sell_price_max: z.number(),
    sell_price_max_date: date,
    buy_price_min: z.number(),
    buy_price_min_date: date,
    buy_price_max: z.number(),
    buy_price_max_date: date,
  }),
);

export type AodpPrice = z.output<typeof pricesSchema>[number];

export function createAodpClient({
  region = "west",
}: AodpClientOptions = {}): AodpClient {
  const prefix = `https://${region}.albion-online-data.com/api/v2/stats/prices/`;
  const limiter = createLimiter();

  return {
    region,
    async getPrices(
      itemIds,
      locations,
      qualities,
      { onEvent = () => undefined } = {},
    ) {
      if (
        itemIds.length === 0 ||
        locations.length === 0 ||
        qualities.length === 0
      ) {
        return { prices: [], failures: [] };
      }
      const query = `locations=${locations
        .map((location) => encodeURIComponent(location))
        .join(",")}&qualities=${qualities.join(",")}`;
      const asked = new Set(
        locations.map((location) => location.toLowerCase()),
      );

      const batches = splitIntoBatches(prefix, itemIds, `.json?${query}`);
      const failures: BatchFailure[] = [];
      let done = 0;
      onEvent({ type: "progress", done, total: batches.length });
      const results = await Promise.all(
        batches.map(async (batch) => {
          const result = await fetchPrices(batch.url, limiter, onEvent);
          done += 1;
          if (result instanceof Error) {
            failures.push({ itemIds: batch.itemIds, error: result });
            onEvent({ type: "error", itemIds: batch.itemIds, error: result });
          }
          onEvent({ type: "progress", done, total: batches.length });
          return result instanceof Error ? [] : result;
        }),
      );
      return {
        prices: results
          .flat()
          .filter(({ city }) => asked.has(city.toLowerCase())),
        failures,
      };
    },
  };
}

function splitIntoBatches(
  prefix: string,
  itemIds: readonly string[],
  suffix: string,
): { itemIds: string[]; url: string }[] {
  // Measured as fetch sends it: the URL parser percent-encodes an apostrophe in the query.
  const room = MAX_URL_LENGTH - new URL(prefix + suffix).href.length;
  const batches: { itemIds: string[]; encoded: string[]; length: number }[] =
    [];
  for (const id of new Set(itemIds)) {
    const encoded = encodeItemId(id);
    const last = batches.at(-1);
    if (last !== undefined && last.length + 1 + encoded.length <= room) {
      last.itemIds.push(id);
      last.encoded.push(encoded);
      last.length += 1 + encoded.length;
    } else if (encoded.length <= room) {
      batches.push({
        itemIds: [id],
        encoded: [encoded],
        length: encoded.length,
      });
    } else {
      throw new Error(
        `Asking for ${id} in these markets and qualities needs a URL longer than ${String(MAX_URL_LENGTH)} characters`,
      );
    }
  }
  return batches.map(({ itemIds, encoded }) => ({
    itemIds,
    url: prefix + encoded.join(",") + suffix,
  }));
}

// `@` is allowed in a URL path, and AODP writes enchanted items with it, like T4_BAG@1.
function encodeItemId(id: string): string {
  return encodeURIComponent(id).replaceAll("%40", "@");
}

async function fetchPrices(
  url: string,
  limiter: Limiter,
  onEvent: (event: AodpEvent) => void,
): Promise<AodpPrice[] | Error> {
  const onWait = (ms: number) => {
    onEvent({ type: "waiting", seconds: Math.ceil(ms / 1000) });
  };
  for (let attempt = 1; ; attempt += 1) {
    const response = await limiter.run(() => fetch(url).catch(toError), onWait);
    if (!(response instanceof Error) && response.ok) {
      return parsePrices(await response.json().catch(() => undefined), url);
    }
    const problem =
      response instanceof Error
        ? response.message
        : `HTTP ${String(response.status)}`;
    const cause = response instanceof Error ? response : undefined;
    if (!isTemporary(response)) {
      return new Error(`Fetching prices failed: ${problem} from ${url}`);
    }
    if (attempt === MAX_ATTEMPTS) {
      return new Error(
        `Fetching prices failed after ${String(MAX_ATTEMPTS)} attempts: ${problem} from ${url}`,
        { cause },
      );
    }
    if (!(response instanceof Error) && response.status === 429) {
      limiter.pauseUntil(resetTime(response));
    }
    await sleep(backoff(attempt));
  }
}

function parsePrices(body: unknown, url: string): AodpPrice[] | Error {
  const result = pricesSchema.safeParse(body);
  return result.success
    ? result.data
    : new Error(`Fetching prices failed: unexpected response from ${url}`, {
        cause: result.error,
      });
}

function isTemporary(response: Response | Error): boolean {
  return (
    response instanceof Error ||
    response.status === 429 ||
    response.status >= 500
  );
}

// Browsers can't read RateLimit-Reset, because AODP doesn't share it with other
// sites. Its limits reset on the minute, so the next minute is the earliest they can.
function resetTime(response: Response): number {
  const reset = Number(response.headers.get("ratelimit-reset"));
  const time =
    reset > 0 ? reset * 1000 : Math.ceil(Date.now() / MINUTE_MS) * MINUTE_MS;
  return time + CLOCK_MARGIN_MS;
}

// Random between half and all of 1 s, 2 s and so on, so that clients that
// failed together don't all retry at the same moment.
function backoff(attempt: number): number {
  const ms = FIRST_BACKOFF_MS * 2 ** (attempt - 1);
  return ms / 2 + (Math.random() * ms) / 2;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toError(reason: unknown): Error {
  return reason instanceof Error ? reason : new Error(String(reason));
}
