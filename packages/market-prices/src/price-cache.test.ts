import "fake-indexeddb/auto";
import { Dexie } from "dexie";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  type AodpClient,
  type AodpPrice,
  type CachedPrices,
  createPriceCache,
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
function fakeAodp(region: Region = "west") {
  const requests: string[][] = [];
  const failing = new Set<string>();
  const client: AodpClient = {
    region,
    getPrices: vi.fn<AodpClient["getPrices"]>(
      (itemIds, locations, qualities) => {
        requests.push([...itemIds]);
        const value = 1000 * requests.length;
        const failed = itemIds.filter((itemId) => failing.has(itemId));
        return Promise.resolve({
          prices: itemIds
            .filter((itemId) => !failing.has(itemId))
            .flatMap((itemId) =>
              locations.flatMap((city) =>
                qualities.map((quality) => row(itemId, city, quality, value)),
              ),
            ),
          failures:
            failed.length === 0
              ? []
              : [{ itemIds: failed, error: new Error("HTTP 503") }],
        });
      },
    ),
  };
  return { client, requests, failing };
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
