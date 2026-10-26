import { delay, http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type AodpClient, type AodpEvent, createAodpClient } from "./index.js";
import pricesNoData from "../test/fixtures/prices-no-data.json" with { type: "json" };
import prices from "../test/fixtures/prices.json" with { type: "json" };
import rateLimited from "../test/fixtures/rate-limited.json" with { type: "json" };
import { server } from "../test/setup.js";

const PRICES = "https://*.albion-online-data.com/api/v2/stats/prices/*";
const NO_DATA = "0001-01-01T00:00:00";
const EMPTY_URL =
  "https://west.albion-online-data.com/api/v2/stats/prices/.json?locations=Caerleon&qualities=1";

const client = createAodpClient();

function serve(rows: object[]): string[] {
  const requested: string[] = [];
  server.use(
    http.get(PRICES, ({ request }) => {
      requested.push(request.url);
      return HttpResponse.json(rows);
    }),
  );
  return requested;
}

function urlOf(recorded: { request: string }): string {
  return recorded.request.replace(/^GET /, "");
}

function askedIds(url: string): string[] {
  const path = new URL(url).pathname;
  return path.slice(path.lastIndexOf("/") + 1, -".json".length).split(",");
}

function priceAt(city: string) {
  return {
    item_id: "T4_BAG",
    city,
    quality: 1,
    sell_price_min: 0,
    sell_price_min_date: NO_DATA,
    sell_price_max: 0,
    sell_price_max_date: NO_DATA,
    buy_price_min: 0,
    buy_price_min_date: NO_DATA,
    buy_price_max: 0,
    buy_price_max_date: NO_DATA,
  };
}

// 11-character IDs, with the last one padded so the URL is exactly `length` long
function idsFillingUrl(length: number, emptyUrl = EMPTY_URL): string[] {
  const room = length - emptyUrl.length;
  const count = Math.floor((room + 1) / 12) - 1;
  const ids = Array.from(
    { length: count },
    (_, index) => `T4_ITEM_${String(index).padStart(3, "0")}`,
  );
  return [...ids, `T4_LAST${"X".repeat(room - 12 * count - 7)}`];
}

describe("getPrices", () => {
  it("asks the west server, as the recorded request did", async () => {
    const requested = serve(prices.body);

    await expect(
      client.getPrices(["T4_BAG", "T5_BAG"], ["Caerleon", "Lymhurst"], [1]),
    ).resolves.toEqual({ prices: prices.body, failures: [] });

    expect(requested).toEqual([urlOf(prices)]);
  });

  it.each(["europe", "east"] as const)(
    "asks the %s server when picked",
    async (region) => {
      const requested = serve([]);

      await createAodpClient({ region }).getPrices(
        ["T4_BAG"],
        ["Caerleon"],
        [1],
      );

      expect(requested).toEqual([
        EMPTY_URL.replace("west", region).replace("/.json", "/T4_BAG.json"),
      ]);
    },
  );

  it("keeps the @ of enchanted items and accepts prices with no data", async () => {
    const requested = serve(pricesNoData.body);

    await expect(
      client.getPrices(["T8_BAG_INSIGHT@4"], ["Thetford"], [5]),
    ).resolves.toEqual({ prices: pricesNoData.body, failures: [] });

    expect(requested).toEqual([urlOf(pricesNoData)]);
  });

  it("encodes market names with spaces and apostrophes", async () => {
    const requested = serve([]);

    await client.getPrices(["T4_BAG"], ["Fort Sterling", "Arthur's Rest"], [1]);

    expect(requested).toEqual([
      "https://west.albion-online-data.com/api/v2/stats/prices/T4_BAG.json?locations=Fort%20Sterling,Arthur%27s%20Rest&qualities=1",
    ]);
  });

  it("returns only the markets it asked for, matching names in any case", async () => {
    serve(
      [
        "Arthurs Rest Smugglers Network",
        "Deepwood Copse Smugglers Network",
        "0",
        "Caerleon",
      ].map(priceAt),
    );

    const { prices: result } = await client.getPrices(
      ["T4_BAG"],
      ["Arthurs Rest Smugglers Network", "Arthur's Rest", "caerleon"],
      [1],
    );

    expect(result.map(({ city }) => city)).toEqual([
      "Arthurs Rest Smugglers Network",
      "Caerleon",
    ]);
  });

  it("asks for all the items in one request when the URL is exactly 4,096 characters", async () => {
    const requested = serve([]);
    const ids = idsFillingUrl(4096);

    await client.getPrices(ids, ["Caerleon"], [1]);

    expect(requested.map((url) => url.length)).toEqual([4096]);
    expect(requested.flatMap(askedIds)).toEqual(ids);
  });

  it("starts a second request when one more item would go over 4,096 characters", async () => {
    const requested = serve([]);
    const ids = [...idsFillingUrl(4096), "T4_ONE_MORE"];

    await client.getPrices(ids, ["Caerleon"], [1]);

    expect(requested.map((url) => url.length)).toEqual([
      4096,
      EMPTY_URL.length + "T4_ONE_MORE".length,
    ]);
    expect(requested.flatMap(askedIds)).toEqual(ids);
  });

  it("counts an apostrophe as the 3 characters fetch sends for it", async () => {
    const requested = serve([]);
    const ids = idsFillingUrl(
      4097,
      "https://west.albion-online-data.com/api/v2/stats/prices/.json?locations=Arthur%27s%20Rest&qualities=1",
    );

    await client.getPrices(ids, ["Arthur's Rest"], [1]);

    expect(requested).toHaveLength(2);
    expect(requested.every((url) => url.length <= 4096)).toBe(true);
  });

  it("asks for each item once", async () => {
    const requested = serve([]);

    await client.getPrices(["T4_BAG", "T5_BAG", "T4_BAG"], ["Caerleon"], [1]);

    expect(requested.flatMap(askedIds)).toEqual(["T4_BAG", "T5_BAG"]);
  });

  it("fails when the markets leave no room for an item", async () => {
    await expect(
      client.getPrices(["T4_BAG"], ["X".repeat(4096)], [1]),
    ).rejects.toThrow(
      "Asking for T4_BAG in these markets and qualities needs a URL longer than 4096 characters",
    );
  });

  it.each([
    { case: "no items", itemIds: [], locations: ["Caerleon"], qualities: [1] },
    { case: "no markets", itemIds: ["T4_BAG"], locations: [], qualities: [1] },
    {
      case: "no qualities",
      itemIds: ["T4_BAG"],
      locations: ["Caerleon"],
      qualities: [],
    },
  ])(
    "returns nothing without a request for $case",
    async ({ itemIds, locations, qualities }) => {
      await expect(
        client.getPrices(itemIds, locations, qualities),
      ).resolves.toEqual({ prices: [], failures: [] });
    },
  );
});

describe("getPrices when AODP fails", () => {
  const T4_BAG_URL = EMPTY_URL.replace("/.json", "/T4_BAG.json");
  const ok = () => HttpResponse.json([priceAt("Caerleon")]);
  const status = (code: number) => () =>
    new HttpResponse(null, { status: code });
  const throttled =
    (headers: Record<string, string> = {}) =>
    () =>
      new HttpResponse(rateLimited.body, { status: 429, headers });

  let aodp: AodpClient;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    aodp = createAodpClient();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // Answers each request with the next response, and returns when each came, in ms
  function serveInTurn(...responses: (() => Response)[]): number[] {
    const startedAt = Date.now();
    const times: number[] = [];
    server.use(
      http.get(PRICES, () => {
        times.push(Date.now() - startedAt);
        return (responses[times.length - 1] ?? status(418))();
      }),
    );
    return times;
  }

  // So long that each one needs its own request
  function soloId(name: string): string {
    return `${name}_${"X".repeat(3000)}`;
  }

  async function getT4Bag(options = {}) {
    const result = aodp.getPrices(["T4_BAG"], ["Caerleon"], [1], options);
    await vi.runAllTimersAsync();
    return result;
  }

  it("retries a server error after a random wait that doubles", async () => {
    const times = serveInTurn(status(503), status(502), ok);

    await expect(getT4Bag()).resolves.toEqual({
      prices: [priceAt("Caerleon")],
      failures: [],
    });

    expect(times).toEqual([0, 750, 2250]);
  });

  it("retries when the request doesn't reach AODP", async () => {
    const times = serveInTurn(() => HttpResponse.error(), ok);

    await expect(getT4Bag()).resolves.toEqual({
      prices: [priceAt("Caerleon")],
      failures: [],
    });

    expect(times).toEqual([0, 750]);
  });

  it("gives up on a batch after 3 attempts, keeps the other batches and reports both", async () => {
    const failing = soloId("T4_FAILING");
    const working = soloId("T4_WORKING");
    let attempts = 0;
    server.use(
      http.get(PRICES, ({ request }) => {
        if (request.url.includes(failing)) {
          attempts += 1;
          return new HttpResponse(null, { status: 503 });
        }
        return ok();
      }),
    );
    const events: AodpEvent[] = [];

    const result = aodp.getPrices([working, failing], ["Caerleon"], [1], {
      onEvent: (event) => events.push(event),
    });
    await vi.runAllTimersAsync();

    const error = new Error(
      `Fetching prices failed after 3 attempts: HTTP 503 from ${EMPTY_URL.replace("/.json", `/${failing}.json`)}`,
    );
    await expect(result).resolves.toEqual({
      prices: [priceAt("Caerleon")],
      failures: [{ itemIds: [failing], error }],
    });
    expect(attempts).toBe(3);
    expect(events).toEqual([
      { type: "progress", done: 0, total: 2 },
      { type: "progress", done: 1, total: 2 },
      { type: "error", itemIds: [failing], error },
      { type: "progress", done: 2, total: 2 },
    ]);
  });

  it("doesn't retry other client errors", async () => {
    const times = serveInTurn(status(404));

    const { failures } = await getT4Bag();

    expect(failures).toEqual([
      {
        itemIds: ["T4_BAG"],
        error: new Error(`Fetching prices failed: HTTP 404 from ${T4_BAG_URL}`),
      },
    ]);
    expect(times).toEqual([0]);
  });

  it.each([
    {
      case: "a row with a price as text",
      body: () =>
        HttpResponse.json([{ ...priceAt("Caerleon"), buy_price_max: "17999" }]),
      path: [0, "buy_price_max"],
    },
    {
      case: "a page that isn't JSON",
      body: () => HttpResponse.text("<html>"),
      path: [],
    },
  ])("doesn't retry $case", async ({ body, path }) => {
    const times = serveInTurn(body);

    const { failures } = await getT4Bag();

    expect(failures[0]?.error).toHaveProperty(
      "message",
      `Fetching prices failed: unexpected response from ${T4_BAG_URL}`,
    );
    expect(failures[0]?.error).toHaveProperty("cause.issues.0.path", path);
    expect(times).toEqual([0]);
  });

  it("waits until RateLimit-Reset after a 429, here the 5-minute limit's", async () => {
    vi.setSystemTime(Date.UTC(2026, 9, 25, 12, 2, 0));
    const reset = Date.UTC(2026, 9, 25, 12, 5, 0) / 1000;
    const times = serveInTurn(
      throttled({ ...rateLimited.headers, "ratelimit-reset": String(reset) }),
      ok,
    );
    const events: AodpEvent[] = [];

    await expect(
      getT4Bag({ onEvent: (event: AodpEvent) => events.push(event) }),
    ).resolves.toEqual({ prices: [priceAt("Caerleon")], failures: [] });

    expect(times).toEqual([0, 181_000]);
    expect(events).toContainEqual({ type: "waiting", seconds: 181 });
  });

  it("waits for the next minute after a 429 whose reset it can't read, as in a browser", async () => {
    vi.setSystemTime(Date.UTC(2026, 9, 25, 12, 0, 20));
    const times = serveInTurn(throttled(), ok);

    await getT4Bag();

    expect(times).toEqual([0, 41_000]);
  });

  it("holds back the client's other requests until the limit resets", async () => {
    vi.setSystemTime(Date.UTC(2026, 9, 25, 12, 0, 20));
    const startedAt = Date.now();
    const requests: string[] = [];
    server.use(
      http.get(PRICES, ({ request }) => {
        requests.push(
          `${askedIds(request.url).join()} at ${String((Date.now() - startedAt) / 1000)} s`,
        );
        return requests.length === 1 ? throttled()() : HttpResponse.json([]);
      }),
    );

    const first = aodp.getPrices(["T4_BAG"], ["Caerleon"], [1]);
    await vi.advanceTimersByTimeAsync(500);
    const second = aodp.getPrices(["T5_BAG"], ["Caerleon"], [1]);
    await vi.runAllTimersAsync();
    await Promise.all([first, second]);

    expect(requests).toEqual([
      "T4_BAG at 0 s",
      "T5_BAG at 41 s",
      "T4_BAG at 41 s",
    ]);
  });

  it("runs at most 3 requests at once", async () => {
    let running = 0;
    let most = 0;
    server.use(
      http.get(PRICES, async () => {
        running += 1;
        most = Math.max(most, running);
        await delay(1000);
        running -= 1;
        return HttpResponse.json([]);
      }),
    );

    const result = aodp.getPrices(
      ["A", "B", "C", "D", "E"].map(soloId),
      ["Caerleon"],
      [1],
    );
    await vi.runAllTimersAsync();

    await expect(result).resolves.toEqual({ prices: [], failures: [] });
    expect(most).toBe(3);
  });
});
