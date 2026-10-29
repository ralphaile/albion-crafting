import "fake-indexeddb/auto";

import { Dexie } from "dexie";
import { afterEach, describe, expect, it } from "vitest";

import {
  type ItemPrices,
  type ObservedPrice,
  openMarketData,
} from "@aoc/market-prices";

import type { SeenPrice } from "./best-crafts.types";
import { withManualPrices } from "./manual-prices.helpers";
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

describe("withManualPrices", () => {
  const MINUTE_MS = 60_000;
  const now = Date.UTC(2026, 9, 28, 14);
  const where = {
    region: "west" as const,
    buyMarketId: "Lymhurst",
    sellMarketId: "Caerleon",
    quality: 1,
    manualStaleAfterMinutes: 3 * 24 * 60,
    preferManual: false,
  };

  function seen(
    value: number,
    minutesAgo: number,
    status: SeenPrice["status"] = "fresh",
  ): SeenPrice {
    return {
      status,
      value,
      observedAt: now - minutesAgo * MINUTE_MS,
      ageMinutes: minutesAgo,
    };
  }

  function apiBars(sellMin: ObservedPrice): ItemPrices {
    return {
      itemId: "T4_METALBAR",
      marketId: "Lymhurst",
      quality: 1,
      sellMin,
      buyMax: seen(80, 900, "stale"),
    };
  }

  function barsUsed(
    sellMin: ObservedPrice,
    typedMinutesAgo: number,
    options: Partial<typeof where> = {},
  ) {
    const typed: ManualPrice = {
      ...artifact,
      itemId: "T4_METALBAR",
      value: 120,
      enteredAt: now - typedMinutesAgo * MINUTE_MS,
    };
    const [bars] = withManualPrices(
      { materials: [apiBars(sellMin)], products: [] },
      [typed],
      { ...where, ...options },
      now,
    ).materials;
    return bars;
  }

  it("uses a typed price newer than the API's, and the API's for the other order", () => {
    expect(barsUsed(seen(100, 120), 90)).toEqual({
      ...apiBars(seen(100, 120)),
      sellMin: {
        ...seen(120, 90),
        origin: "manual",
        passedOver: seen(100, 120),
      },
      buyMax: { ...seen(80, 900, "stale"), origin: "api" },
    });
  });

  it("uses an API price newer than the typed one", () => {
    expect(barsUsed(seen(100, 30), 90)?.sellMin).toEqual({
      ...seen(100, 30),
      origin: "api",
      passedOver: seen(120, 90),
    });
  });

  it("counts a typed price as stale once it's older than the expiry", () => {
    const fourDays = 4 * 24 * 60;
    const staleApi = seen(100, 13 * 60, "stale");

    expect(barsUsed(staleApi, fourDays)?.sellMin).toEqual({
      ...staleApi,
      origin: "api",
      passedOver: seen(120, fourDays, "stale"),
    });
    expect(
      barsUsed(staleApi, fourDays, { manualStaleAfterMinutes: 7 * 24 * 60 })
        ?.sellMin,
    ).toEqual({
      ...seen(120, fourDays),
      origin: "manual",
      passedOver: staleApi,
    });
  });

  it("uses the typed price whenever there is one when manual prices are preferred", () => {
    expect(
      barsUsed(seen(100, 30), 90, { preferManual: true })?.sellMin,
    ).toEqual({
      ...seen(120, 90),
      origin: "manual",
      passedOver: seen(100, 30),
    });
  });

  it("adds a price AODP had no row for, at the market it's for", () => {
    const { materials, products } = withManualPrices(
      { materials: [], products: [] },
      [{ ...sword, enteredAt: now - 90 * MINUTE_MS }],
      where,
      now,
    );

    expect(materials).toEqual([]);
    expect(products).toEqual([
      {
        itemId: "T4_MAIN_SWORD",
        marketId: "Caerleon",
        quality: 1,
        sellMin: { ...seen(5000, 90), origin: "manual" },
        buyMax: { status: "missing", origin: "api" },
      },
    ]);
  });

  it.each([
    ["server", { region: "europe" as const }],
    ["market", { marketId: "Martlock" }],
    ["quality", { quality: 2 }],
  ])("ignores a manual price for another %s", (_other, overrides) => {
    const prices = { materials: [apiBars(seen(100, 120))], products: [] };
    const typed = { ...artifact, itemId: "T4_METALBAR", ...overrides };

    expect(withManualPrices(prices, [typed], where, now)).toEqual(
      withManualPrices(prices, [], where, now),
    );
  });
});
