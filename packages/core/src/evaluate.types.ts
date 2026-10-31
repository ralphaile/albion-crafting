import type { Hideout, HideoutProductionBonus } from "./hideout-bonus.types.js";
import type { OrderPrices } from "./market.types.js";
import type { BuyMode, Material, MaterialCost } from "./material-cost.types.js";
import type {
  CraftingLocation,
  DailyBonus,
  ProductionBonus,
} from "./production-bonus.types.js";
import type { Revenue, SellMode } from "./revenue.types.js";

export interface RecipeAlternative {
  focus: number;
  silver: number;
  amountCrafted: number;
  materials: readonly Material[];
}

export interface Recipe extends RecipeAlternative {
  itemId: string;
  craftingCategory?: string;
  itemValue?: number;
  alternatives: readonly RecipeAlternative[];
}

export type CraftingPlace =
  { location: CraftingLocation } | { hideout: Hideout };

export interface EvaluateSettings {
  focus: boolean;
  premium: boolean;
  buyMode: BuyMode;
  sellMode: SellMode;
  undercut?: boolean;
  stationFee: number;
  dailyBonuses?: readonly DailyBonus[];
  fce?: (itemId: string) => number;
}

export interface EvaluatePrices {
  materials: ReadonlyMap<string, OrderPrices>;
  products: ReadonlyMap<string, OrderPrices>;
}

interface EvaluationBase {
  itemId: string;
  alternative: number;
  missingPrices: string[];
  bonus: ProductionBonus | HideoutProductionBonus;
  rrr: number;
  materialCost: MaterialCost;
  stationFee: number | undefined;
  silverCost: number;
  revenue: Revenue;
  focusCost?: number;
}

export type Evaluation =
  | (EvaluationBase & { status: "incomplete" })
  | (EvaluationBase & {
      status: "complete";
      profit: number;
      margin: number | undefined;
      silverPerFocus?: number;
    });

export type Evaluations = readonly [Evaluation, ...Evaluation[]];
