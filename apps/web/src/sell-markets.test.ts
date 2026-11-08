import { describe, expect, it } from "vitest";

import { recipes } from "@aoc/crafting-data";
import type {
  HistorySummary,
  ItemPrices,
  ObservedPrice,
} from "@aoc/market-prices";

import { evaluateCrafts } from "./best-crafts.helpers";
import type { UsedItemPrices } from "./best-crafts.types";
import type { ManualPrice } from "./manual-prices.types";
import { DEFAULT_ROUTE } from "./route.constants";
import { compareSellMarkets } from "./sell-markets.helpers";
import { DEFAULT_SETTINGS } from "./settings.constants";

const NOW = 1_000_000_000_000;

const MARKETS = ["Lymhurst", "Caerleon", "Black Market", "Martlock"];

function seen(value: number): ObservedPrice {
  return {
    status: "fresh",
    value,
    observedAt: NOW - 30 * 60_000,
    ageMinutes: 30,
  };
}

function sword(
  marketId: string,
  prices: Partial<Pick<ItemPrices, "sellMin" | "buyMax">>,
): ItemPrices {
  return {
    itemId: "T4_MAIN_SWORD",
    marketId,
    quality: 1,
    sellMin: { status: "missing" },
    buyMax: { status: "missing" },
    ...prices,
  };
}

function material(itemId: string, value: number): UsedItemPrices {
  return {
    itemId,
    marketId: "Lymhurst",
    quality: 1,
    sellMin: { ...seen(value), origin: "api" },
    buyMax: { status: "missing", origin: "api" },
  };
}

const broadswordRecipe = recipes.find(
  ({ itemId }) => itemId === "T4_MAIN_SWORD",
);

// The broadsword as the table works it out selling in Lymhurst, at 5,000.
function broadsword(materials = [material("T4_METALBAR", 100)]) {
  if (broadswordRecipe === undefined) {
    throw new Error("No broadsword recipe");
  }
  const [craft] = evaluateCrafts(
    [broadswordRecipe],
    DEFAULT_ROUTE.place,
    DEFAULT_SETTINGS,
    {
      materials: [...materials, material("T4_LEATHER", 50)],
      products: [
        {
          ...sword("Lymhurst", {}),
          sellMin: { ...seen(5000), origin: "api" },
          buyMax: { status: "missing", origin: "api" },
        },
      ],
    },
  );
  if (craft === undefined) {
    throw new Error("No broadsword craft");
  }
  return craft;
}

const fetched = {
  prices: [
    sword("Lymhurst", { sellMin: seen(5000) }),
    sword("Caerleon", { sellMin: seen(6200) }),
    sword("Black Market", { buyMax: seen(5600) }),
  ],
  history: [] as HistorySummary[],
};

function compare({
  craft = broadsword(),
  prices = fetched,
  manualPrices = [] as ManualPrice[],
  settings = DEFAULT_SETTINGS,
  sellMarketId = "Lymhurst",
} = {}) {
  return compareSellMarkets(
    craft,
    MARKETS,
    prices,
    manualPrices,
    settings,
    sellMarketId,
    NOW,
  );
}

describe("compareSellMarkets", () => {
  it("nets each market's price, best first, and works out the profit from the same costs", () => {
    const craft = broadsword();
    const { offers, best, current, gain } = compare({ craft });

    expect(offers.map(({ marketId }) => marketId)).toEqual([
      "Caerleon",
      "Black Market",
      "Lymhurst",
      "Martlock",
    ]);
    // A sell order pays 4% premium tax and a 2.5% setup fee. The Black Market
    // only buys, so it's sold to its buy order without a setup fee.
    expect(offers.map(({ revenue }) => revenue)).toMatchObject([
      { source: "sellMin", net: 6200 * 0.935 },
      { source: "buyMax", net: 5600 * 0.96, setupFee: 0 },
      { source: "sellMin", net: 5000 * 0.935 },
      { status: "missing" },
    ]);
    if (craft.status !== "complete" || craft.revenue.status === "missing") {
      throw new Error("The broadsword should be complete");
    }
    const cost = craft.revenue.net - craft.profit;
    expect(offers.map(({ profit }) => profit)).toEqual([
      6200 * 0.935 - cost,
      5600 * 0.96 - cost,
      craft.profit,
      undefined,
    ]);
    expect(offers[3]?.price).toMatchObject({ status: "missing" });
    expect(best?.marketId).toBe("Caerleon");
    expect(current?.marketId).toBe("Lymhurst");
    expect(gain).toBeCloseTo(6200 * 0.935 - 5000 * 0.935);
  });

  it("has no gain when the current market is the best, or has no price", () => {
    expect(compare({ sellMarketId: "Caerleon" }).gain).toBeUndefined();
    expect(compare({ sellMarketId: "Martlock" }).gain).toBeUndefined();
  });

  it("uses a price typed for one market only in that market", () => {
    const typed: ManualPrice = {
      region: "west",
      itemId: "T4_MAIN_SWORD",
      marketId: "Martlock",
      quality: 1,
      source: "sellMin",
      value: 7000,
      enteredAt: NOW,
    };

    const { offers, best } = compare({ manualPrices: [typed] });

    expect(best?.marketId).toBe("Martlock");
    expect(best?.price).toMatchObject({ value: 7000, origin: "manual" });
    expect(
      offers.filter(({ price }) => price.origin === "manual"),
    ).toHaveLength(1);
  });

  it("judges each market's price against that market's own 7-day average", () => {
    const history = (marketId: string, averagePrice: number) => ({
      itemId: "T4_MAIN_SWORD",
      marketId,
      quality: 1,
      averagePrice,
      averageDailyVolume: 10,
      newestDay: undefined,
    });

    const { offers } = compare({
      prices: {
        ...fetched,
        history: [history("Caerleon", 2000), history("Lymhurst", 5000)],
      },
      settings: { ...DEFAULT_SETTINGS, useAverageForOutliers: true },
    });

    const priceIn = (marketId: string) =>
      offers.find((offer) => offer.marketId === marketId)?.price;
    expect(priceIn("Caerleon")).toMatchObject({
      value: 2000,
      outlier: { seen: 6200, average: 2000, usingAverage: true },
    });
    expect(priceIn("Lymhurst")).toMatchObject({ value: 5000 });
    expect(priceIn("Lymhurst")).not.toHaveProperty("outlier");
  });

  it("has no profit while a material's price is missing, but still nets each market", () => {
    const { offers } = compare({ craft: broadsword([]) });

    expect(offers[0]).toMatchObject({
      marketId: "Caerleon",
      revenue: { net: 6200 * 0.935 },
      profit: undefined,
    });
  });
});
