import type { Evaluation } from "@aoc/core";
import type { GameRecipe } from "@aoc/crafting-data";
import type { ItemPrices, ObservedPrice } from "@aoc/market-prices";

export interface CraftPrices {
  materials: readonly ItemPrices[];
  products: readonly ItemPrices[];
}

type SeenPrice = Exclude<ObservedPrice, { status: "missing" }>;

export type Craft = Evaluation & {
  recipe: GameRecipe;
  specialty: boolean;
  itemPrice: ObservedPrice;
  materialPrices: ReadonlyMap<string, ObservedPrice>;
  oldestMaterialPrice: SeenPrice | undefined;
};
