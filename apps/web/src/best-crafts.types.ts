import type { Evaluation, PriceOrigin } from "@aoc/core";
import type { GameRecipe } from "@aoc/crafting-data";
import type { ItemPrices, ObservedPrice } from "@aoc/market-prices";

export interface CraftPrices {
  materials: readonly ItemPrices[];
  products: readonly ItemPrices[];
}

// How many sell a day in the sell market. "none" when AODP has no history of
// it there, as is common in Black Zone markets. "unknown" until its history
// arrives, or when fetching it failed.
export type DailyVolume = number | "none" | "unknown";

export type SeenPrice = Exclude<ObservedPrice, { status: "missing" }>;

// When there's both an API price and a typed one, `passedOver` is the one not
// used.
export type UsedPrice = ObservedPrice & {
  origin: PriceOrigin;
  passedOver?: SeenPrice;
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
export type Craft = CraftAlternative & {
  recipe: GameRecipe;
  specialty: boolean;
  dailyVolume: DailyVolume;
  alternatives: readonly [CraftAlternative, ...CraftAlternative[]];
};
