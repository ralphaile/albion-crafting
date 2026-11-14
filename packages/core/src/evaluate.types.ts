import type { Hideout, HideoutProductionBonus } from "./hideout-bonus.types.js";
import type { JournalValue, RecipeJournal } from "./journal.types.js";
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

// A refining recipe, such as a metal bar, gets the place's refining bonuses.
export interface Recipe extends RecipeAlternative {
  itemId: string;
  refining?: boolean;
  craftingCategory?: string;
  itemValue?: number;
  journal?: RecipeJournal;
  // Made from an item it takes the quality of, such as a faction cape from a
  // cape: bought at Normal quality, it comes out Normal.
  keepsQuality?: boolean;
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
  journals?: boolean;
  qualityWeighted?: boolean;
}

export interface EvaluatePrices {
  materials: ReadonlyMap<string, OrderPrices>;
  products: ReadonlyMap<string, OrderPrices>;
  // Qualities 2 to 5 of the products, by item and quality.
  productQualities?: ReadonlyMap<string, ReadonlyMap<number, OrderPrices>>;
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
  journal?: JournalValue;
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
