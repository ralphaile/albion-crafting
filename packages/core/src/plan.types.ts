import type {
  CraftingPlace,
  EvaluatePrices,
  EvaluateSettings,
  Evaluation,
  Recipe,
} from "./evaluate.types.js";
import type { DailyBonus } from "./production-bonus.types.js";
import type { SellMode } from "./revenue.types.js";

// `quantity` is how many items you want. They're made in whole crafts, so a
// recipe that makes 4 at once makes 8 for a quantity of 5.
export interface PlanEntry {
  recipe: Recipe;
  alternative: number;
  quantity: number;
  focus: boolean;
  dailyBonuses: readonly DailyBonus[];
}

// Each place has the prices of the markets it buys and sells in. `sellMode`
// overrides the plan's, as a sell-only market such as the Black Market needs.
export interface PlanLocation {
  place: CraftingPlace;
  prices: EvaluatePrices;
  sellMode?: SellMode;
  entries: readonly PlanEntry[];
}

export type PlanSettings = Omit<EvaluateSettings, "focus" | "dailyBonuses">;

// `count` is what you expect to buy, after the materials that come back.
export interface PlannedMaterial {
  itemId: string;
  count: number;
}

// Silver sums only count the entries with every price. `missingPrices` lists
// the items with none, once each.
export interface PlanTotals {
  status: "complete" | "incomplete";
  focus: number;
  cost: number;
  revenue: number;
  profit: number;
  missingPrices: string[];
}

interface PlannedEntryBase {
  evaluation: Evaluation;
  crafts: number;
  made: number;
  materials: PlannedMaterial[];
  focus: number;
}

export type PlannedEntry =
  | (PlannedEntryBase & { status: "incomplete" })
  | (PlannedEntryBase & {
      status: "complete";
      cost: number;
      revenue: number;
      profit: number;
    });

export interface PlannedLocation {
  entries: PlannedEntry[];
  totals: PlanTotals;
}

export interface PlanResult {
  locations: PlannedLocation[];
  totals: PlanTotals;
}
