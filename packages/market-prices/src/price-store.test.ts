import "fake-indexeddb/auto";
import { Dexie } from "dexie";
import { afterEach, describe, expect, it, vi } from "vitest";

import { openPriceStore, type PriceKey, type StoredPrice } from "./index.js";

const NO_DATA = "0001-01-01T00:00:00";
const KEY: PriceKey = ["west", "T4_BAG", "Caerleon", 1];

function stored(overrides: Partial<StoredPrice> = {}): StoredPrice {
  return {
    region: "west",
    fetchedAt: Date.UTC(2026, 9, 26, 12, 0),
    item_id: "T4_BAG",
    city: "Caerleon",
    quality: 1,
    sell_price_min: 40000,
    sell_price_min_date: "2026-10-26T11:45:00",
    sell_price_max: 0,
    sell_price_max_date: NO_DATA,
    buy_price_min: 0,
    buy_price_min_date: NO_DATA,
    buy_price_max: 3505,
    buy_price_max_date: "2026-10-26T11:30:00",
    ...overrides,
  };
}

// Firefox's private windows used to refuse IndexedDB this way.
function openWithoutIndexedDb() {
  vi.spyOn(Dexie.prototype, "open").mockRejectedValueOnce(
    new DOMException("IndexedDB is not available", "InvalidStateError"),
  );
  return openPriceStore();
}

afterEach(async () => {
  vi.restoreAllMocks();
  await new Dexie("aoc-price-cache").delete();
});

describe.each([
  { storage: "IndexedDB", open: openPriceStore, persistent: true },
  { storage: "memory", open: openWithoutIndexedDb, persistent: false },
])("openPriceStore in $storage", ({ open, persistent }) => {
  it("says whether its prices survive a reload", async () => {
    const store = await open();

    expect(store.persistent).toBe(persistent);
  });

  it("keeps one price for each region, item, market and quality", async () => {
    const store = await open();

    await store.prices.put([
      stored(),
      stored({ region: "europe" }),
      stored({ item_id: "T5_BAG" }),
      stored({ city: "Lymhurst" }),
      stored({ quality: 2 }),
    ]);
    await store.prices.put([stored({ sell_price_min: 41000 })]);

    expect(
      await store.prices.get([
        KEY,
        ["europe", "T4_BAG", "Caerleon", 1],
        ["west", "T5_BAG", "Caerleon", 1],
        ["west", "T4_BAG", "Lymhurst", 1],
        ["west", "T4_BAG", "Caerleon", 2],
      ]),
    ).toEqual([
      stored({ sell_price_min: 41000 }),
      stored({ region: "europe" }),
      stored({ item_id: "T5_BAG" }),
      stored({ city: "Lymhurst" }),
      stored({ quality: 2 }),
    ]);
  });

  it("returns only the prices it has", async () => {
    const store = await open();
    await store.prices.put([stored()]);

    expect(
      await store.prices.get([["west", "T6_BAG", "Caerleon", 1], KEY]),
    ).toEqual([stored()]);
  });

  it("forgets every price when cleared", async () => {
    const store = await open();
    await store.prices.put([stored(), stored({ region: "east" })]);

    await store.clear();

    expect(
      await store.prices.get([KEY, ["east", "T4_BAG", "Caerleon", 1]]),
    ).toEqual([]);
  });
});

describe("openPriceStore", () => {
  it("still has the prices after the page reloads", async () => {
    const before = await openPriceStore();
    await before.prices.put([stored()]);

    const after = await openPriceStore();

    expect(await after.prices.get([KEY])).toEqual([stored()]);
  });
});
