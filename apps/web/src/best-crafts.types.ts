import type { Evaluation, PriceOrigin } from "@aoc/core";
import type { GameRecipe } from "@aoc/crafting-data";
import type { ItemPrices, ObservedPrice } from "@aoc/market-prices";

export interface CraftPrices {
  materials: readonly ItemPrices[];
  products: readonly ItemPrices[];
}

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

export type Craft = Evaluation & {
  recipe: GameRecipe;
  specialty: boolean;
  itemPrice: UsedPrice;
  materialPrices: ReadonlyMap<string, UsedPrice>;
  oldestMaterialPrice: Exclude<UsedPrice, { status: "missing" }> | undefined;
};
