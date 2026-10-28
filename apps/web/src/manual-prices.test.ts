import "fake-indexeddb/auto";

import { Dexie } from "dexie";
import { afterEach, describe, expect, it } from "vitest";

import { openMarketData } from "@aoc/market-prices";

import {
  memoryManualPriceStore,
  openManualPriceStore,
} from "./manual-prices.store";
import type { ManualPrice } from "./manual-prices.types";

const artifact: ManualPrice = {
  region: "west",
  itemId: "T4_ARTEFACT_MAIN_SCIMITAR_MORGANA",
  marketId: "Lymhurst",
  quality: 1,
  source: "sellMin",
  value: 12_000,
  enteredAt: Date.UTC(2026, 9, 28, 12),
};

const sword: ManualPrice = {
  ...artifact,
  itemId: "T4_MAIN_SWORD",
  marketId: "Caerleon",
  value: 5000,
};

async function writeRaw(...rows: unknown[]) {
  const db = new Dexie("aoc-manual-prices");
  db.version(1).stores({ prices: "[region+itemId+marketId+quality+source]" });
  await db.table("prices").bulkPut(rows);
  db.close();
}

describe.each([
  ["IndexedDB", openManualPriceStore],
  ["memory", () => Promise.resolve(memoryManualPriceStore())],
])("the manual prices kept in %s", (_where, openStore) => {
  afterEach(async () => {
    await new Dexie("aoc-manual-prices").delete();
  });

  it("has none at first", async () => {
    const store = await openStore();

    await expect(store.list()).resolves.toEqual([]);
  });

  it("keeps one price per server, item, market, quality and order", async () => {
    const store = await openStore();
    const otherOrders = [
      { ...artifact, region: "europe" as const },
      { ...artifact, marketId: "Martlock" },
      { ...artifact, quality: 2 },
      { ...artifact, source: "buyMax" as const },
    ];
    for (const price of [artifact, ...otherOrders]) {
      await store.save(price);
    }
    await store.save({ ...artifact, value: 11_500 });

    const listed = await store.list();
    expect(listed).toHaveLength(5);
    expect(listed).toContainEqual({ ...artifact, value: 11_500 });
  });

  it("removes only the price asked for", async () => {
    const store = await openStore();
    await store.save(artifact);
    await store.save(sword);

    await store.remove(artifact);

    await expect(store.list()).resolves.toEqual([sword]);
  });
});

describe("openManualPriceStore", () => {
  afterEach(async () => {
    await new Dexie("aoc-manual-prices").delete();
    await new Dexie("aoc-price-cache").delete();
  });

  it("keeps the prices between visits", async () => {
    const store = await openManualPriceStore();
    await store.save(artifact);

    const nextVisit = await openManualPriceStore();

    expect(nextVisit.persistent).toBe(true);
    await expect(nextVisit.list()).resolves.toEqual([artifact]);
  });

  it("skips a saved price that doesn't fit, and keeps the others", async () => {
    await writeRaw(
      artifact,
      { ...sword, value: 0 },
      { ...sword, marketId: "Martlock", region: "mars" },
      { ...sword, marketId: "Thetford", source: "average" },
    );

    const store = await openManualPriceStore();

    await expect(store.list()).resolves.toEqual([artifact]);
  });

  it("keeps the prices when the price cache is cleared", async () => {
    const store = await openManualPriceStore();
    await store.save(artifact);

    await (await openMarketData()).clear();

    await expect(store.list()).resolves.toEqual([artifact]);
  });
});
