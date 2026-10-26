import { z } from "zod";

export type Region = "west" | "europe" | "east";

export interface AodpClientOptions {
  region?: Region;
}

export interface AodpClient {
  getPrices(
    itemIds: readonly string[],
    locations: readonly string[],
    qualities: readonly number[],
  ): Promise<AodpPrice[]>;
}

const MAX_URL_LENGTH = 4096;

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

  return {
    async getPrices(itemIds, locations, qualities) {
      if (
        itemIds.length === 0 ||
        locations.length === 0 ||
        qualities.length === 0
      ) {
        return [];
      }
      const query = `locations=${locations
        .map((location) => encodeURIComponent(location))
        .join(",")}&qualities=${qualities.join(",")}`;
      const asked = new Set(
        locations.map((location) => location.toLowerCase()),
      );

      const prices: AodpPrice[] = [];
      for (const url of batchUrls(prefix, itemIds, `.json?${query}`)) {
        prices.push(...(await fetchPrices(url)));
      }
      return prices.filter(({ city }) => asked.has(city.toLowerCase()));
    },
  };
}

function batchUrls(
  prefix: string,
  itemIds: readonly string[],
  suffix: string,
): string[] {
  // Measured as fetch sends it: the URL parser percent-encodes an apostrophe in the query.
  const room = MAX_URL_LENGTH - new URL(prefix + suffix).href.length;
  const batches: { ids: string[]; length: number }[] = [];
  for (const id of new Set(itemIds.map(encodeItemId))) {
    const last = batches.at(-1);
    if (last !== undefined && last.length + 1 + id.length <= room) {
      last.ids.push(id);
      last.length += 1 + id.length;
    } else if (id.length <= room) {
      batches.push({ ids: [id], length: id.length });
    } else {
      throw new Error(
        `Asking for ${id} in these markets and qualities needs a URL longer than ${String(MAX_URL_LENGTH)} characters`,
      );
    }
  }
  return batches.map(({ ids }) => prefix + ids.join(",") + suffix);
}

// `@` is allowed in a URL path, and AODP writes enchanted items with it, like T4_BAG@1.
function encodeItemId(id: string): string {
  return encodeURIComponent(id).replaceAll("%40", "@");
}

async function fetchPrices(url: string): Promise<AodpPrice[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Fetching prices failed: HTTP ${String(response.status)} from ${url}`,
    );
  }
  const result = pricesSchema.safeParse(await response.json());
  if (!result.success) {
    throw new Error(
      `Fetching prices failed: unexpected fields in the response from ${url}`,
      { cause: result.error },
    );
  }
  return result.data;
}
