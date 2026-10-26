import "fake-indexeddb/auto";
import { Dexie } from "dexie";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  type AodpClient,
  type AodpHistory,
  type AodpPrice,
  type CachedPrices,
  createHistoryCache,
  createPriceCache,
  normalizePrices,
  openPriceStore,
  type PriceStore,
  type Region,
} from "./index.js";

const NO_DATA = "0001-01-01T00:00:00";
const START = Date.UTC(2026, 9, 26, 12, 0);
const MINUTE_MS = 60_000;

let store: PriceStore;

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(START);
  store = await openPriceStore();
});

afterEach(async () => {
  vi.useRealTimers();
  await new Dexie("aoc-price-cache").delete();
});

function minutesLater(minutes: number) {
  vi.setSystemTime(START + minutes * MINUTE_MS);
}

// Answers each request with a row per item, market and quality, priced at 1000
// times the request's number, so each result shows which request it came from.
// Like AODP, it sends nothing for the items in `unanswered`.
function fakeAodp(region: Region = "west") {
  const requests: string[][] = [];
  const failing = new Set<string>();
  const unanswered = new Set<string>();

  function answer<T>(
    itemIds: readonly string[],
    marketIds: readonly string[],
    qualities: readonly number[],
    rowOf: (
      itemId: string,
      marketId: string,
      quality: number,
      value: number,
    ) => T,
  ) {
    requests.push([...itemIds]);
    const value = 1000 * requests.length;
    const failed = itemIds.filter((itemId) => failing.has(itemId));
    return {
      rows: itemIds
        .filter((itemId) => !failing.has(itemId) && !unanswered.has(itemId))
        .flatMap((itemId) =>
          marketIds.flatMap((marketId) =>
            qualities.map((quality) => rowOf(itemId, marketId, quality, value)),
          ),
        ),
      failures:
        failed.length === 0
          ? []
          : [{ itemIds: failed, error: new Error("HTTP 503") }],
    };
  }

  const client: AodpClient = {
    region,
    getPrices: vi.fn<AodpClient["getPrices"]>(
      (itemIds, marketIds, qualities) => {
        const { rows, failures } = answer(itemIds, marketIds, qualities, row);
        return Promise.resolve({ prices: rows, failures });
      },
    ),
    getHistory: vi.fn<AodpClient["getHistory"]>(
      (itemIds, marketIds, qualities) => {
        const { rows, failures } = answer(
          itemIds,
          marketIds,
          qualities,
          series,
        );
        return Promise.resolve({ history: rows, failures });
      },
    ),
  };
  return { client, requests, failing, unanswered };
}

function series(
  itemId: string,
  location: string,
  quality: number,
  value: number,
): AodpHistory {
  return {
    location,
    item_id: itemId,
    quality,
    data: [
      { item_count: 10, avg_price: value, timestamp: "2026-10-25T00:00:00" },
    ],
  };
}

function row(
  itemId: string,
  city: string,
  quality: number,
  value: number,
): AodpPrice {
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

function summary({ prices }: CachedPrices): string[] {
  return prices
    .map(
      (price) =>
        `${price.item_id} ${price.city} q${String(price.quality)}: ${String(price.sell_price_min)}`,
    )
    .sort();
}

describe("getPrices", () => {
  it("fetches prices it doesn't have and notes when", async () => {
    const { client } = fakeAodp();
    const cache = createPriceCache({ client, store });

    const result = await cache.getPrices(["T4_BAG"], ["Caerleon"], [1, 2]);

    expect(result).toEqual({
      prices: [
        {
          ...row("T4_BAG", "Caerleon", 1, 1000),
          region: "west",
          fetchedAt: START,
        },
        {
          ...row("T4_BAG", "Caerleon", 2, 1000),
          region: "west",
          fetchedAt: START,
        },
      ],
      failures: [],
      fetchedAt: START,
    });
  });

  it("reuses prices fetched less than 15 minutes ago, even after a reload", async () => {
    const { client, requests } = fakeAodp();
    await createPriceCache({ client, store }).getPrices(
      ["T4_BAG"],
      ["Caerleon"],
      [1],
    );

    minutesLater(14.9);
    const reloaded = createPriceCache({
      client,
      store: await openPriceStore(),
    });
    const result = await reloaded.getPrices(["T4_BAG"], ["Caerleon"], [1]);

    expect(requests).toHaveLength(1);
    expect(summary(result)).toEqual(["T4_BAG Caerleon q1: 1000"]);
    expect(result.fetchedAt).toBe(START);
  });

  it("fetches prices again once they're 15 minutes old", async () => {
    const { client, requests } = fakeAodp();
    const cache = createPriceCache({ client, store });
    await cache.getPrices(["T4_BAG"], ["Caerleon"], [1]);

    minutesLater(15);
    const result = await cache.getPrices(["T4_BAG"], ["Caerleon"], [1]);

    expect(requests).toEqual([["T4_BAG"], ["T4_BAG"]]);
    expect(summary(result)).toEqual(["T4_BAG Caerleon q1: 2000"]);
    expect(result.fetchedAt).toBe(START + 15 * MINUTE_MS);
  });

  it("reuses prices for as long as it's told to", async () => {
    const { client, requests } = fakeAodp();
    const cache = createPriceCache({ client, store, ttlMinutes: 60 });
    await cache.getPrices(["T4_BAG"], ["Caerleon"], [1]);

    minutesLater(59);
    await cache.getPrices(["T4_BAG"], ["Caerleon"], [1]);
    minutesLater(60);
    await cache.getPrices(["T4_BAG"], ["Caerleon"], [1]);

    expect(requests).toEqual([["T4_BAG"], ["T4_BAG"]]);
  });

  it("fetches only the items it has no recent prices for", async () => {
    const { client, requests } = fakeAodp();
    const cache = createPriceCache({ client, store });
    await cache.getPrices(["T4_BAG"], ["Caerleon"], [1]);

    minutesLater(5);
    const result = await cache.getPrices(
      ["T4_BAG", "T5_BAG"],
      ["Caerleon"],
      [1],
    );

    expect(requests).toEqual([["T4_BAG"], ["T5_BAG"]]);
    expect(summary(result)).toEqual([
      "T4_BAG Caerleon q1: 1000",
      "T5_BAG Caerleon q1: 2000",
    ]);
    expect(result.fetchedAt).toBe(START);
  });

  it("fetches an item again when a market or quality asked for is missing", async () => {
    const { client, requests } = fakeAodp();
    const cache = createPriceCache({ client, store });
    await cache.getPrices(["T4_BAG"], ["Caerleon"], [1]);

    const result = await cache.getPrices(
      ["T4_BAG"],
      ["Caerleon", "Lymhurst"],
      [1],
    );

    expect(requests).toEqual([["T4_BAG"], ["T4_BAG"]]);
    expect(summary(result)).toEqual([
      "T4_BAG Caerleon q1: 2000",
      "T4_BAG Lymhurst q1: 2000",
    ]);
  });

  it("counts an item, market or quality asked for twice once", async () => {
    const { client, requests } = fakeAodp();
    const cache = createPriceCache({ client, store });
    const ask = () =>
      cache.getPrices(["T4_BAG", "T4_BAG"], ["Caerleon", "Caerleon"], [1, 1]);

    await ask();
    const result = await ask();

    expect(requests).toEqual([["T4_BAG"]]);
    expect(summary(result)).toEqual(["T4_BAG Caerleon q1: 1000"]);
  });

  it("fetches everything again when forced to, as Refresh prices does", async () => {
    const { client, requests } = fakeAodp();
    const cache = createPriceCache({ client, store });
    await cache.getPrices(["T4_BAG"], ["Caerleon"], [1]);

    minutesLater(1);
    const result = await cache.getPrices(["T4_BAG"], ["Caerleon"], [1], {
      force: true,
    });

    expect(requests).toEqual([["T4_BAG"], ["T4_BAG"]]);
    expect(summary(result)).toEqual(["T4_BAG Caerleon q1: 2000"]);
    expect(result.fetchedAt).toBe(START + MINUTE_MS);
  });

  it("keeps the older prices of an item that fails to fetch, and reports the failure", async () => {
    const { client, failing } = fakeAodp();
    const cache = createPriceCache({ client, store });
    await cache.getPrices(["T4_BAG", "T5_BAG"], ["Caerleon"], [1]);

    minutesLater(20);
    failing.add("T4_BAG");
    const result = await cache.getPrices(
      ["T4_BAG", "T5_BAG"],
      ["Caerleon"],
      [1],
    );

    expect(summary(result)).toEqual([
      "T4_BAG Caerleon q1: 1000",
      "T5_BAG Caerleon q1: 2000",
    ]);
    expect(result.failures).toEqual([
      { itemIds: ["T4_BAG"], error: new Error("HTTP 503") },
    ]);
    expect(result.fetchedAt).toBe(START);
  });

  it("has no fetch time when it has no prices", async () => {
    const { client, failing } = fakeAodp();
    failing.add("T4_BAG");

    const result = await createPriceCache({ client, store }).getPrices(
      ["T4_BAG"],
      ["Caerleon"],
      [1],
    );

    expect(result.prices).toEqual([]);
    expect(result.fetchedAt).toBeUndefined();
  });

  it("keeps each server's prices apart", async () => {
    const west = fakeAodp("west");
    const europe = fakeAodp("europe");
    await createPriceCache({ client: west.client, store }).getPrices(
      ["T4_BAG"],
      ["Caerleon"],
      [1],
    );

    const result = await createPriceCache({
      client: europe.client,
      store,
    }).getPrices(["T4_BAG"], ["Caerleon"], [1]);

    expect(europe.requests).toEqual([["T4_BAG"]]);
    expect(result.prices.map((price) => price.region)).toEqual(["europe"]);
  });

  it("passes the client's events on", async () => {
    const { client } = fakeAodp();
    const onEvent = vi.fn();

    await createPriceCache({ client, store }).getPrices(
      ["T4_BAG"],
      ["Caerleon"],
      [1],
      { force: true, onEvent },
    );

    expect(client.getPrices).toHaveBeenCalledWith(
      ["T4_BAG"],
      ["Caerleon"],
      [1],
      { onEvent },
    );
  });
});

describe("getPrices for what AODP sends nothing for", () => {
  it("saves it as missing, so it doesn't ask again", async () => {
    const { client, requests, unanswered } = fakeAodp();
    unanswered.add("T4_BAG");
    const cache = createPriceCache({ client, store });

    const result = await cache.getPrices(["T4_BAG"], ["Caerleon"], [1]);
    await cache.getPrices(["T4_BAG"], ["Caerleon"], [1]);

    expect(requests).toHaveLength(1);
    expect(normalizePrices(result.prices)).toEqual([
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
    const { client } = fakeAodp();
    vi.mocked(client.getPrices).mockResolvedValueOnce({
      prices: [row("T4_BAG", "Caerleon", 1, 1000)],
      failures: [],
    });

    const result = await createPriceCache({ client, store }).getPrices(
      ["T4_BAG"],
      ["caerleon"],
      [1],
    );

    expect(summary(result)).toEqual(["T4_BAG Caerleon q1: 1000"]);
  });
});

describe("getHistory", () => {
  it("reuses history fetched less than 6 hours ago", async () => {
    const { client, requests } = fakeAodp();
    const cache = createHistoryCache({ client, store });
    await cache.getHistory(["T4_BAG"], ["Caerleon"], [1]);

    minutesLater(359.9);
    const reused = await cache.getHistory(["T4_BAG"], ["Caerleon"], [1]);
    minutesLater(360);
    const refetched = await cache.getHistory(["T4_BAG"], ["Caerleon"], [1]);

    expect(requests).toEqual([["T4_BAG"], ["T4_BAG"]]);
    expect(reused.history).toEqual([
      {
        ...series("T4_BAG", "Caerleon", 1, 1000),
        region: "west",
        fetchedAt: START,
      },
    ]);
    expect(refetched.fetchedAt).toBe(START + 360 * MINUTE_MS);
  });

  it("saves an empty history for an item nobody bought, so it doesn't ask again", async () => {
    const { client, requests, unanswered } = fakeAodp();
    unanswered.add("T8_BAG_INSIGHT@4");
    const cache = createHistoryCache({ client, store });

    await cache.getHistory(["T8_BAG_INSIGHT@4"], ["Thetford"], [5]);
    const result = await cache.getHistory(
      ["T8_BAG_INSIGHT@4"],
      ["Thetford"],
      [5],
    );

    expect(requests).toHaveLength(1);
    expect(result.history).toEqual([
      {
        location: "Thetford",
        item_id: "T8_BAG_INSIGHT@4",
        quality: 5,
        data: [],
        region: "west",
        fetchedAt: START,
      },
    ]);
  });

  it("doesn't take prices for history", async () => {
    const { client, requests } = fakeAodp();
    await createPriceCache({ client, store }).getPrices(
      ["T4_BAG"],
      ["Caerleon"],
      [1],
    );

    await createHistoryCache({ client, store }).getHistory(
      ["T4_BAG"],
      ["Caerleon"],
      [1],
    );

    expect(requests).toEqual([["T4_BAG"], ["T4_BAG"]]);
    expect(client.getHistory).toHaveBeenCalledOnce();
  });
});
