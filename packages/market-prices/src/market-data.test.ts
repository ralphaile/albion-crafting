import "fake-indexeddb/auto";
import { Dexie } from "dexie";
import { delay, http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  type PartialHistory,
  type PartialPrices,
  type PricesResult,
  openMarketData,
} from "./index.js";
import { server } from "../test/setup.js";

const PRICES = "https://*.albion-online-data.com/api/v2/stats/prices/*";
const HISTORY = "https://*.albion-online-data.com/api/v2/stats/history/*";
const NO_DATA = "0001-01-01T00:00:00";
const START = Date.UTC(2026, 9, 26, 12, 0);
const SEEN = Date.UTC(2026, 9, 26, 11, 45);
const MINUTE_MS = 60_000;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(START);
});

afterEach(async () => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  await new Dexie("aoc-price-cache").delete();
});

function minutesLater(minutes: number) {
  vi.setSystemTime(START + minutes * MINUTE_MS);
}

// Answers like AODP, with a row per item, market and quality it's asked for,
// priced at 1000 times the request's number, so each result shows which request
// it came from. It sends nothing for the items in `unanswered`, and fails every
// request that asks for an item in `failing`.
function fakeAodp() {
  const requests: string[] = [];
  const failing = new Set<string>();
  const unanswered = new Set<string>();

  function answer(endpoint: "prices" | "history") {
    return http.get(endpoint === "prices" ? PRICES : HISTORY, ({ request }) => {
      const url = new URL(request.url);
      const file = url.pathname.slice(url.pathname.lastIndexOf("/") + 1);
      const itemIds = decodeURIComponent(file.replace(/\.json$/, "")).split(
        ",",
      );
      const marketIds = (url.searchParams.get("locations") ?? "").split(",");
      const qualities = (url.searchParams.get("qualities") ?? "")
        .split(",")
        .map(Number);
      requests.push(
        `${url.hostname.split(".")[0] ?? ""} ${endpoint} ${itemIds.join(",")}`,
      );
      if (itemIds.some((itemId) => failing.has(itemId))) {
        return new HttpResponse(null, { status: 404 });
      }
      const value = 1000 * requests.length;
      return HttpResponse.json(
        itemIds
          .filter((itemId) => !unanswered.has(itemId))
          .flatMap((itemId) =>
            marketIds.flatMap((marketId) =>
              qualities.map((quality) =>
                endpoint === "prices"
                  ? priceRow(itemId, marketId, quality, value)
                  : historySeries(itemId, marketId, quality, value),
              ),
            ),
          ),
      );
    });
  }

  server.use(answer("prices"), answer("history"));
  return { requests, failing, unanswered };
}

function priceRow(
  itemId: string,
  city: string,
  quality: number,
  value: number,
) {
  return {
    item_id: itemId,
    city,
    quality,
    sell_price_min: value,
    sell_price_min_date: "2026-10-26T11:45:00",
    sell_price_max: 0,
    sell_price_max_date: NO_DATA,
    buy_price_min: 0,
    buy_price_min_date: NO_DATA,
    buy_price_max: 0,
    buy_price_max_date: NO_DATA,
  };
}

function historySeries(
  itemId: string,
  location: string,
  quality: number,
  value: number,
) {
  return {
    location,
    item_id: itemId,
    quality,
    data: [
      { item_count: 70, avg_price: value, timestamp: "2026-10-25T00:00:00" },
    ],
  };
}

// So long that each one needs its own request
function longId(name: string): string {
  return `${name}_${"X".repeat(3000)}`;
}

function summary({ prices }: PricesResult): string[] {
  return prices
    .map(
      ({ itemId, marketId, quality, sellMin }) =>
        `${itemId.replace(/_X+$/, "")} ${marketId} q${String(quality)}: ${sellMin.status === "missing" ? "missing" : String(sellMin.value)}`,
    )
    .sort();
}

describe("openMarketData", () => {
  it("keeps prices in the browser, where they survive a reload", async () => {
    const { requests } = fakeAodp();
    const before = await openMarketData();
    await before.getPrices(["T4_BAG"], ["Caerleon"], [1]);

    const after = await openMarketData();
    const result = await after.getPrices(["T4_BAG"], ["Caerleon"], [1]);

    expect(before.persistent).toBe(true);
    expect(requests).toHaveLength(1);
    expect(summary(result)).toEqual(["T4_BAG Caerleon q1: 1000"]);
  });

  it("still has the prices saved before it kept history", async () => {
    const { requests } = fakeAodp();
    const old = new Dexie("aoc-price-cache");
    old.version(1).stores({ prices: "[region+item_id+city+quality]" });
    await old.table("prices").put({
      ...priceRow("T4_BAG", "Caerleon", 1, 500),
      region: "west",
      fetchedAt: START,
    });
    old.close();

    const marketData = await openMarketData();
    const prices = await marketData.getPrices(["T4_BAG"], ["Caerleon"], [1]);
    const history = await marketData.getHistory(["T4_BAG"], ["Caerleon"], [1]);

    expect(summary(prices)).toEqual(["T4_BAG Caerleon q1: 500"]);
    expect(history.history).toHaveLength(1);
    expect(requests).toEqual(["west history T4_BAG"]);
  });

  it("shares one rate limit between prices and history", async () => {
    let inFlight = 0;
    let mostInFlight = 0;
    const slowly = async () => {
      inFlight += 1;
      mostInFlight = Math.max(mostInFlight, inFlight);
      await delay(50);
      inFlight -= 1;
      return HttpResponse.json([]);
    };
    server.use(http.get(PRICES, slowly), http.get(HISTORY, slowly));
    const marketData = await openMarketData();

    await Promise.all([
      marketData.getPrices(["T4_BAG"], ["Caerleon"], [1]),
      marketData.getPrices(["T5_BAG"], ["Caerleon"], [1]),
      marketData.getHistory(["T6_BAG"], ["Caerleon"], [1]),
      marketData.getHistory(["T7_BAG"], ["Caerleon"], [1]),
    ]);

    expect(mostInFlight).toBe(3);
  });
});

// Firefox's private windows used to refuse IndexedDB this way.
function refuseIndexedDb() {
  vi.spyOn(Dexie.prototype, "open").mockRejectedValue(
    new DOMException("IndexedDB is not available", "InvalidStateError"),
  );
}

describe.each([
  { storage: "IndexedDB", persistent: true },
  { storage: "memory", persistent: false },
])("openMarketData in $storage", ({ persistent }) => {
  beforeEach(() => {
    if (!persistent) {
      refuseIndexedDb();
    }
  });

  it("says whether its prices survive a reload", async () => {
    const marketData = await openMarketData();

    expect(marketData.persistent).toBe(persistent);
  });

  it("forgets prices and history when cleared", async () => {
    const { requests } = fakeAodp();
    const marketData = await openMarketData();
    await marketData.getPrices(["T4_BAG"], ["Caerleon"], [1]);
    await marketData.getHistory(["T4_BAG"], ["Caerleon"], [1]);

    await marketData.clear();
    await marketData.getPrices(["T4_BAG"], ["Caerleon"], [1]);
    await marketData.getHistory(["T4_BAG"], ["Caerleon"], [1]);

    expect(requests).toEqual([
      "west prices T4_BAG",
      "west history T4_BAG",
      "west prices T4_BAG",
      "west history T4_BAG",
    ]);
  });

  describe("getPrices", () => {
    it("fetches prices it doesn't have, says how old each one is, and notes when it fetched them", async () => {
      fakeAodp();
      const marketData = await openMarketData();

      const result = await marketData.getPrices(
        ["T4_BAG"],
        ["Caerleon"],
        [1, 2],
      );

      expect(result).toEqual({
        prices: [1, 2].map((quality) => ({
          itemId: "T4_BAG",
          marketId: "Caerleon",
          quality,
          sellMin: {
            status: "fresh",
            value: 1000,
            observedAt: SEEN,
            ageMinutes: 15,
          },
          buyMax: { status: "missing" },
        })),
        failures: [],
        fetchedAt: START,
      });
    });

    it("reuses prices fetched less than 15 minutes ago, which keep ageing", async () => {
      const { requests } = fakeAodp();
      const marketData = await openMarketData();
      await marketData.getPrices(["T4_BAG"], ["Caerleon"], [1]);

      minutesLater(14.9);
      const result = await marketData.getPrices(["T4_BAG"], ["Caerleon"], [1]);

      expect(requests).toHaveLength(1);
      expect(result.prices[0]?.sellMin).toMatchObject({
        value: 1000,
        ageMinutes: 29,
      });
      expect(result.fetchedAt).toBe(START);
    });

    it("counts a price as stale once it's older than it's told to", async () => {
      fakeAodp();
      const marketData = await openMarketData();

      const result = await marketData.getPrices(["T4_BAG"], ["Caerleon"], [1], {
        staleAfterMinutes: 10,
      });

      expect(result.prices[0]?.sellMin).toMatchObject({
        status: "stale",
        ageMinutes: 15,
      });
    });

    it("fetches prices again once they're 15 minutes old", async () => {
      const { requests } = fakeAodp();
      const marketData = await openMarketData();
      await marketData.getPrices(["T4_BAG"], ["Caerleon"], [1]);

      minutesLater(15);
      const result = await marketData.getPrices(["T4_BAG"], ["Caerleon"], [1]);

      expect(requests).toEqual(["west prices T4_BAG", "west prices T4_BAG"]);
      expect(summary(result)).toEqual(["T4_BAG Caerleon q1: 2000"]);
      expect(result.fetchedAt).toBe(START + 15 * MINUTE_MS);
    });

    it("fetches only the items it has no recent prices for", async () => {
      const { requests } = fakeAodp();
      const marketData = await openMarketData();
      await marketData.getPrices(["T4_BAG"], ["Caerleon"], [1]);

      minutesLater(5);
      const result = await marketData.getPrices(
        ["T4_BAG", "T5_BAG"],
        ["Caerleon"],
        [1],
      );

      expect(requests).toEqual(["west prices T4_BAG", "west prices T5_BAG"]);
      expect(summary(result)).toEqual([
        "T4_BAG Caerleon q1: 1000",
        "T5_BAG Caerleon q1: 2000",
      ]);
      expect(result.fetchedAt).toBe(START);
    });

    it("fetches an item again when a market or quality asked for is missing", async () => {
      const { requests } = fakeAodp();
      const marketData = await openMarketData();
      await marketData.getPrices(["T4_BAG"], ["Caerleon"], [1]);

      const result = await marketData.getPrices(
        ["T4_BAG"],
        ["Caerleon", "Lymhurst"],
        [1],
      );

      expect(requests).toEqual(["west prices T4_BAG", "west prices T4_BAG"]);
      expect(summary(result)).toEqual([
        "T4_BAG Caerleon q1: 2000",
        "T4_BAG Lymhurst q1: 2000",
      ]);
    });

    it("counts an item, market or quality asked for twice once", async () => {
      const { requests } = fakeAodp();
      const marketData = await openMarketData();
      const ask = () =>
        marketData.getPrices(
          ["T4_BAG", "T4_BAG"],
          ["Caerleon", "Caerleon"],
          [1, 1],
        );

      await ask();
      const result = await ask();

      expect(requests).toEqual(["west prices T4_BAG"]);
      expect(summary(result)).toEqual(["T4_BAG Caerleon q1: 1000"]);
    });

    it("fetches the items it's told to refetch even when they're recent, as Retry failed does", async () => {
      const { requests } = fakeAodp();
      const marketData = await openMarketData();
      await marketData.getPrices(["T4_BAG", "T5_BAG"], ["Caerleon"], [1]);

      minutesLater(1);
      const result = await marketData.getPrices(
        ["T4_BAG", "T5_BAG"],
        ["Caerleon"],
        [1],
        { refetch: ["T5_BAG"] },
      );

      expect(requests).toEqual([
        "west prices T4_BAG,T5_BAG",
        "west prices T5_BAG",
      ]);
      expect(summary(result)).toEqual([
        "T4_BAG Caerleon q1: 1000",
        "T5_BAG Caerleon q1: 2000",
      ]);
    });

    it("reports the prices it has even when it needs to fetch none", async () => {
      fakeAodp();
      const marketData = await openMarketData();
      const first = await marketData.getPrices(["T4_BAG"], ["Caerleon"], [1]);
      const partials: PartialPrices[] = [];

      await marketData.getPrices(["T4_BAG"], ["Caerleon"], [1], {
        onPartial: (read) => partials.push(read()),
      });

      expect(partials).toEqual([
        { prices: first.prices, fetchedAt: first.fetchedAt },
      ]);
    });

    it("fetches everything again when forced to, as Refresh prices does", async () => {
      const { requests } = fakeAodp();
      const marketData = await openMarketData();
      await marketData.getPrices(["T4_BAG"], ["Caerleon"], [1]);

      minutesLater(1);
      const result = await marketData.getPrices(["T4_BAG"], ["Caerleon"], [1], {
        force: true,
      });

      expect(requests).toEqual(["west prices T4_BAG", "west prices T4_BAG"]);
      expect(summary(result)).toEqual(["T4_BAG Caerleon q1: 2000"]);
      expect(result.fetchedAt).toBe(START + MINUTE_MS);
    });

    it("keeps the older prices of items that fail to fetch, and reports the failure", async () => {
      const { failing } = fakeAodp();
      const marketData = await openMarketData();
      await marketData.getPrices(["T4_BAG", "T5_BAG"], ["Caerleon"], [1]);

      minutesLater(20);
      failing.add("T4_BAG");
      const result = await marketData.getPrices(
        ["T4_BAG", "T5_BAG"],
        ["Caerleon"],
        [1],
      );

      expect(summary(result)).toEqual([
        "T4_BAG Caerleon q1: 1000",
        "T5_BAG Caerleon q1: 1000",
      ]);
      expect(result.failures).toMatchObject([
        {
          itemIds: ["T4_BAG", "T5_BAG"],
          error: { message: expect.stringContaining("HTTP 404") as string },
        },
      ]);
      expect(result.fetchedAt).toBe(START);
    });

    it("reports the older prices at once, then each batch as it arrives", async () => {
      fakeAodp();
      const marketData = await openMarketData();
      const items = [longId("T4_FIRST"), longId("T4_SECOND")];
      const before = await marketData.getPrices(items, ["Caerleon"], [1]);
      const partials: PartialPrices[] = [];

      minutesLater(1);
      const after = await marketData.getPrices(items, ["Caerleon"], [1], {
        force: true,
        onPartial: (read) => partials.push(read()),
      });

      const [atOnce, oneBatch, bothBatches] = partials.map((partial) =>
        summary({ ...partial, failures: [] }),
      );
      expect(partials).toHaveLength(3);
      expect(atOnce).toEqual(summary(before));
      expect(oneBatch).not.toEqual(summary(before));
      expect(oneBatch).not.toEqual(summary(after));
      expect(bothBatches).toEqual(summary(after));
      expect(partials.map(({ fetchedAt }) => fetchedAt)).toEqual([
        START,
        START,
        START + MINUTE_MS,
      ]);
    });

    it("keeps the batches that arrived before it was cancelled", async () => {
      const { requests } = fakeAodp();
      const marketData = await openMarketData();
      const [first, second] = [longId("T4_FIRST"), longId("T4_SECOND")];
      server.use(
        http.get(
          PRICES,
          async ({ request }) => {
            if (request.url.includes(second)) {
              await delay("infinite");
            }
          },
          { once: true },
        ),
      );
      const controller = new AbortController();

      const result = await marketData.getPrices(
        [first, second],
        ["Caerleon"],
        [1],
        {
          signal: controller.signal,
          onPartial: (read) => {
            if (read().prices.length > 0) {
              controller.abort();
            }
          },
        },
      );
      requests.length = 0;
      const again = await marketData.getPrices(
        [first, second],
        ["Caerleon"],
        [1],
      );

      expect(summary(result)).toEqual(["T4_FIRST Caerleon q1: 1000"]);
      expect(result.failures).toMatchObject([{ itemIds: [second] }]);
      expect(requests).toEqual([`west prices ${second}`]);
      expect(summary(again)).toEqual([
        "T4_FIRST Caerleon q1: 1000",
        "T4_SECOND Caerleon q1: 1000",
      ]);
    });

    it("has no fetch time when it has no prices", async () => {
      const { failing } = fakeAodp();
      failing.add("T4_BAG");
      const marketData = await openMarketData();

      const result = await marketData.getPrices(["T4_BAG"], ["Caerleon"], [1]);

      expect(result.prices).toEqual([]);
      expect(result.fetchedAt).toBeUndefined();
    });

    it("keeps each server's prices apart", async () => {
      const { requests } = fakeAodp();
      const marketData = await openMarketData();
      await marketData.getPrices(["T4_BAG"], ["Caerleon"], [1]);

      const result = await marketData.getPrices(["T4_BAG"], ["Caerleon"], [1], {
        region: "europe",
      });

      expect(requests).toEqual(["west prices T4_BAG", "europe prices T4_BAG"]);
      expect(summary(result)).toEqual(["T4_BAG Caerleon q1: 2000"]);
    });

    it("says how the fetch is going", async () => {
      fakeAodp();
      const marketData = await openMarketData();
      const onEvent = vi.fn();

      await marketData.getPrices(["T4_BAG"], ["Caerleon"], [1], { onEvent });

      expect(onEvent.mock.calls).toEqual([
        [{ type: "progress", done: 0, total: 1 }],
        [{ type: "progress", done: 1, total: 1 }],
      ]);
    });

    it("saves what AODP sends nothing for as missing, so it doesn't ask again", async () => {
      const { requests, unanswered } = fakeAodp();
      unanswered.add("T4_BAG");
      const marketData = await openMarketData();

      const result = await marketData.getPrices(["T4_BAG"], ["Caerleon"], [1]);
      await marketData.getPrices(["T4_BAG"], ["Caerleon"], [1]);

      expect(requests).toHaveLength(1);
      expect(result.prices).toEqual([
        {
          itemId: "T4_BAG",
          marketId: "Caerleon",
          quality: 1,
          sellMin: { status: "missing" },
          buyMax: { status: "missing" },
        },
      ]);
    });

    it("takes a market AODP spells differently as answered", async () => {
      server.use(
        http.get(PRICES, () =>
          HttpResponse.json([priceRow("T4_BAG", "Caerleon", 1, 1000)]),
        ),
      );
      const marketData = await openMarketData();

      const result = await marketData.getPrices(["T4_BAG"], ["caerleon"], [1]);

      expect(summary(result)).toEqual(["T4_BAG Caerleon q1: 1000"]);
    });
  });

  describe("getPrices with a snapshot", () => {
    const SNAPSHOT_URL = "https://site.test/prices/";
    const SNAPSHOT_SEEN = Date.UTC(2026, 9, 26, 10, 0);

    // Serves the site's snapshot files, and notes which ones are asked for.
    function fakeSnapshot(files: Record<string, Record<string, unknown>>) {
      const requested: string[] = [];
      server.use(
        http.get(`${SNAPSHOT_URL}*`, ({ request }) => {
          const path = new URL(request.url).pathname.replace("/prices/", "");
          requested.push(path);
          return path in files
            ? HttpResponse.json(files[path])
            : new HttpResponse(null, { status: 404 });
        }),
      );
      return requested;
    }

    const caerleon = {
      fetchedAt: SNAPSHOT_SEEN,
      rows: [
        ["T4_BAG", 900, "2026-10-26T10:00:00", 800, "2026-10-26T10:00:00"],
        ["T5_BAG", 1900, "2026-10-26T10:00:00", 0, NO_DATA],
      ],
    };

    function fromSnapshot(value: number) {
      return {
        status: "fresh",
        value,
        observedAt: SNAPSHOT_SEEN,
        ageMinutes: 120,
        fromSnapshot: true,
      };
    }

    it("prices the items AODP can't answer for from the snapshot, on a first visit", async () => {
      const { failing } = fakeAodp();
      failing.add("T4_BAG");
      const requested = fakeSnapshot({ "west/caerleon.json": caerleon });
      const marketData = await openMarketData({ snapshotUrl: SNAPSHOT_URL });

      const result = await marketData.getPrices(
        ["T4_BAG", "T5_BAG"],
        ["Caerleon"],
        [1],
      );

      expect(result.prices).toEqual([
        {
          itemId: "T4_BAG",
          marketId: "Caerleon",
          quality: 1,
          sellMin: fromSnapshot(900),
          buyMax: fromSnapshot(800),
        },
        {
          itemId: "T5_BAG",
          marketId: "Caerleon",
          quality: 1,
          sellMin: fromSnapshot(1900),
          buyMax: { status: "missing" },
        },
      ]);
      expect(result.failures).toHaveLength(1);
      expect(result.fetchedAt).toBe(SNAPSHOT_SEEN);
      expect(requested).toEqual(["west/caerleon.json"]);
    });

    it("keeps each side's saved price when it's newer than the snapshot's", async () => {
      const { failing } = fakeAodp();
      fakeSnapshot({ "west/caerleon.json": caerleon });
      const marketData = await openMarketData({ snapshotUrl: SNAPSHOT_URL });
      await marketData.getPrices(["T4_BAG"], ["Caerleon"], [1]);

      minutesLater(20);
      failing.add("T4_BAG");
      const result = await marketData.getPrices(["T4_BAG"], ["Caerleon"], [1]);

      expect(result.prices[0]?.sellMin).toEqual({
        status: "fresh",
        value: 1000,
        observedAt: SEEN,
        ageMinutes: 35,
      });
      expect(result.prices[0]?.buyMax).toMatchObject({
        value: 800,
        fromSnapshot: true,
      });
    });

    it("doesn't download the snapshot while AODP answers", async () => {
      fakeAodp();
      const requested = fakeSnapshot({ "west/caerleon.json": caerleon });
      const marketData = await openMarketData({ snapshotUrl: SNAPSHOT_URL });

      await marketData.getPrices(["T4_BAG"], ["Caerleon"], [1]);

      expect(requested).toEqual([]);
    });

    it("downloads each server's market once, however often AODP fails", async () => {
      const { failing } = fakeAodp();
      failing.add("T4_BAG");
      const requested = fakeSnapshot({});
      const marketData = await openMarketData({ snapshotUrl: SNAPSHOT_URL });

      await marketData.getPrices(["T4_BAG"], ["Caerleon", "Black Market"], [1]);
      await marketData.getPrices(["T4_BAG"], ["Caerleon"], [1], {
        force: true,
      });
      await marketData.getPrices(["T4_BAG"], ["Caerleon"], [1], {
        region: "east",
      });

      expect(requested.sort()).toEqual([
        "east/caerleon.json",
        "west/black-market.json",
        "west/caerleon.json",
      ]);
    });

    it.each([
      ["missing", {}],
      ["unreadable", { "west/caerleon.json": { rows: "lots" } }],
    ])("counts a %s snapshot as none", async (_case, files) => {
      const { failing } = fakeAodp();
      failing.add("T4_BAG");
      fakeSnapshot(files);
      const marketData = await openMarketData({ snapshotUrl: SNAPSHOT_URL });

      const result = await marketData.getPrices(["T4_BAG"], ["Caerleon"], [1]);

      expect(result.prices).toEqual([]);
      expect(result.fetchedAt).toBeUndefined();
    });
  });

  describe("getHistory", () => {
    it("sums up the newest 7 days, and reuses history fetched less than 6 hours ago", async () => {
      const { requests } = fakeAodp();
      const marketData = await openMarketData();
      await marketData.getHistory(["T4_BAG"], ["Caerleon"], [1]);

      minutesLater(359.9);
      const reused = await marketData.getHistory(["T4_BAG"], ["Caerleon"], [1]);
      minutesLater(360);
      const refetched = await marketData.getHistory(
        ["T4_BAG"],
        ["Caerleon"],
        [1],
      );

      expect(requests).toEqual(["west history T4_BAG", "west history T4_BAG"]);
      expect(reused).toEqual({
        history: [
          {
            itemId: "T4_BAG",
            marketId: "Caerleon",
            quality: 1,
            averagePrice: 1000,
            averageDailyVolume: 10,
            newestDay: Date.UTC(2026, 9, 25),
          },
        ],
        failures: [],
        fetchedAt: START,
      });
      expect(refetched.fetchedAt).toBe(START + 360 * MINUTE_MS);
    });

    it("averages over as many days as it's told to", async () => {
      fakeAodp();
      const marketData = await openMarketData();

      const result = await marketData.getHistory(
        ["T4_BAG"],
        ["Caerleon"],
        [1],
        {
          days: 1,
        },
      );

      expect(result.history[0]?.averageDailyVolume).toBe(70);
    });

    it("sums up an item nobody bought as none sold, and doesn't ask again", async () => {
      const { requests, unanswered } = fakeAodp();
      unanswered.add("T8_BAG_INSIGHT@4");
      const marketData = await openMarketData();

      await marketData.getHistory(["T8_BAG_INSIGHT@4"], ["Thetford"], [5]);
      const result = await marketData.getHistory(
        ["T8_BAG_INSIGHT@4"],
        ["Thetford"],
        [5],
      );

      expect(requests).toHaveLength(1);
      expect(result.history).toEqual([
        {
          itemId: "T8_BAG_INSIGHT@4",
          marketId: "Thetford",
          quality: 5,
          averagePrice: undefined,
          averageDailyVolume: 0,
          newestDay: undefined,
        },
      ]);
    });

    it("reports the history it has at once, then each batch as it arrives", async () => {
      fakeAodp();
      const marketData = await openMarketData();
      await marketData.getHistory(["T4_BAG"], ["Caerleon"], [1]);
      const partials: PartialHistory[] = [];

      const result = await marketData.getHistory(
        ["T4_BAG", "T5_BAG"],
        ["Caerleon"],
        [1],
        { onPartial: (read) => partials.push(read()) },
      );

      expect(
        partials.map(({ history }) => history.map(({ itemId }) => itemId)),
      ).toEqual([["T4_BAG"], ["T4_BAG", "T5_BAG"]]);
      expect(partials.at(-1)?.history).toEqual(result.history);
    });

    it("doesn't take prices for history", async () => {
      const { requests } = fakeAodp();
      const marketData = await openMarketData();
      await marketData.getPrices(["T4_BAG"], ["Caerleon"], [1]);

      await marketData.getHistory(["T4_BAG"], ["Caerleon"], [1]);

      expect(requests).toEqual(["west prices T4_BAG", "west history T4_BAG"]);
    });
  });
});
