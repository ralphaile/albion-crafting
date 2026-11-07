import "fake-indexeddb/auto";

import { Dexie } from "dexie";
import { afterEach, describe, expect, it } from "vitest";

import { type EvaluatePrices, type OrderPrices, evaluatePlan } from "@aoc/core";

import { NO_PLAN } from "./plan.constants";
import { planLocations } from "./plan.helpers";
import { parsePlan } from "./plan.schema";
import type { CraftingPlan, PlanEntry } from "./plan.types";
import { DEFAULT_ROUTE_CHOICE } from "./route.constants";
import type { RouteChoice } from "./route.types";
import { PLAN_SETTING } from "./saved-settings.constants";
import { openSettingsStore } from "./saved-settings.store";

const lymhurst: RouteChoice = {
  place: { kind: "location", locationId: "1000" },
  buyMarketId: "Lymhurst",
  sellMarketId: "Lymhurst",
};

const forestHideout: RouteChoice = {
  place: { kind: "hideout", biomeId: "FOREST", quality: 6, level: 9 },
  buyMarketId: "Lymhurst",
  sellMarketId: "Black Market",
};

function broadswords(changes: Partial<PlanEntry> = {}): PlanEntry {
  return {
    id: "broadswords",
    itemId: "T4_MAIN_SWORD",
    alternative: 0,
    quantity: 10,
    focus: true,
    dailyBonus: 0,
    ...changes,
  };
}

const plan: CraftingPlan = {
  locations: [
    { id: "city", route: lymhurst, entries: [broadswords()] },
    {
      id: "hideout",
      route: forestHideout,
      entries: [broadswords({ quantity: 5, focus: false, dailyBonus: 0.2 })],
    },
  ],
};

describe("parsePlan", () => {
  it("keeps a plan that fits", () => {
    expect(parsePlan(plan)).toEqual(plan);
  });

  it("leaves out entries for items it has no recipe for, or with no quantity", () => {
    const parsed = parsePlan({
      locations: [
        {
          id: "city",
          route: lymhurst,
          entries: [
            broadswords(),
            broadswords({ itemId: "T4_GONE" }),
            broadswords({ quantity: 0 }),
            "junk",
          ],
        },
      ],
    });

    expect(parsed.locations[0]?.entries).toEqual([broadswords()]);
  });

  it("falls back to the usual recipe, the default route and no daily bonus when those don't fit", () => {
    const parsed = parsePlan({
      locations: [
        {
          id: "city",
          route: { place: "nowhere" },
          entries: [broadswords({ alternative: 9, dailyBonus: 0.5 as 0 })],
        },
      ],
    });

    expect(parsed.locations[0]).toEqual({
      id: "city",
      route: DEFAULT_ROUTE_CHOICE,
      entries: [broadswords()],
    });
  });

  it("is an empty plan when nothing fits", () => {
    expect(parsePlan("junk")).toEqual(NO_PLAN);
    expect(parsePlan({ locations: "junk" })).toEqual(NO_PLAN);
  });
});

describe("the saved plan", () => {
  afterEach(async () => {
    await new Dexie("aoc-settings").delete();
  });

  it("survives a reload", async () => {
    await (await openSettingsStore()).save(PLAN_SETTING, plan);

    await expect(
      (await openSettingsStore()).load(PLAN_SETTING),
    ).resolves.toEqual(plan);
  });
});

describe("planLocations", () => {
  const fresh = (value: number): OrderPrices => ({
    sellMin: { status: "fresh", value },
    buyMax: { status: "fresh", value },
  });
  const prices: EvaluatePrices = {
    materials: new Map([
      ["T4_METALBAR", fresh(100)],
      ["T4_LEATHER", fresh(50)],
    ]),
    products: new Map([["T4_MAIN_SWORD", fresh(5000)]]),
  };

  it("gives core the same item at a city and a hideout, each at its own place, prices and daily bonus", () => {
    const asked: string[] = [];
    const locations = planLocations(plan, (route) => {
      asked.push(`${route.buyMarketId} → ${route.sellMarketId}`);
      return prices;
    });

    expect(asked).toEqual(["Lymhurst → Lymhurst", "Lymhurst → Black Market"]);
    expect(locations[0]?.place).toMatchObject({ location: { id: "1000" } });
    expect(locations[1]?.place).toHaveProperty("hideout");
    expect(locations[1]?.entries[0]).toMatchObject({
      quantity: 5,
      focus: false,
      dailyBonuses: [{ category: "sword", bonus: 0.2 }],
    });

    const result = evaluatePlan(locations, {
      premium: true,
      buyMode: "instant",
      sellMode: "order",
      stationFee: 500,
    });
    expect(result.locations.map(({ totals }) => totals.status)).toEqual([
      "complete",
      "complete",
    ]);
    expect(result.totals.revenue).toBeCloseTo(15 * 5000 * 0.935, 6);
    expect(result.totals.focus).toBe(10 * 1286);
  });
});
