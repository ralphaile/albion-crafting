import type { Evaluation, PriceOrigin } from "@aoc/core";
import type { GameRecipe } from "@aoc/crafting-data";
import type {
  HistorySummary,
  ItemPrices,
  ObservedPrice,
} from "@aoc/market-prices";

export interface CraftPrices {
  materials: readonly ItemPrices[];
  products: readonly ItemPrices[];
}

// The materials' history in the buy market, and the products' in the sell
// market.
export interface CraftHistory {
  materials: readonly HistorySummary[];
  products: readonly HistorySummary[];
}

// How many sell a day in the sell market. "none" when AODP has no history of
// it there, as is common in Black Zone markets. "unknown" until its history
// arrives, or when fetching it failed.
export type DailyVolume = number | "none" | "unknown";

export type SeenPrice = Exclude<ObservedPrice, { status: "missing" }>;

// An API price far from its 7-day average. With `usingAverage`, the price's
// value is the average, and `seen` is the price AODP had.
interface Outlier {
  seen: number;
  average: number;
  usingAverage: boolean;
}

// When there's both an API price and a typed one, `passedOver` is the one not
// used.
export type UsedPrice = ObservedPrice & {
  origin: PriceOrigin;
  passedOver?: SeenPrice;
  outlier?: Outlier;
};

export interface UsedItemPrices extends Omit<ItemPrices, "sellMin" | "buyMax"> {
  sellMin: UsedPrice;
  buyMax: UsedPrice;
}

export interface UsedPrices {
  materials: readonly UsedItemPrices[];
  products: readonly UsedItemPrices[];
}

// One recipe's result, with the prices it used.
export type CraftAlternative = Evaluation & {
  itemPrice: UsedPrice;
  materialPrices: ReadonlyMap<string, UsedPrice>;
  oldestMaterialPrice: Exclude<UsedPrice, { status: "missing" }> | undefined;
};

// The result of the recipe the table uses, and of every recipe for the item,
// the default one first.
// `recipeChosen` is set when the craft uses a recipe you chose.
export type Craft = CraftAlternative & {
  recipe: GameRecipe;
  recipeChosen?: true;
  specialty: boolean;
  dailyVolume: DailyVolume;
  alternatives: readonly [CraftAlternative, ...CraftAlternative[]];
};
