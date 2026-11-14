import { SETUP_FEE } from "@aoc/core";
import type { GameRecipe } from "@aoc/crafting-data";

import type { Craft, UsedPrice, UsedPrices } from "./best-crafts.types";
import { craftCost } from "./enchant-paths.helpers";
import { RECIPES_BY_ID } from "./recipes.constants";

// The gear the recipes are made from and keep the quality of, such as T4_CAPE
// for T4_CAPEITEM_FW_MARTLOCK, or T4_HEAD_CLOTH_SET1 for a royal cowl.
export function baseItems(recipes: readonly GameRecipe[]): GameRecipe[] {
  const ids = new Set(
    recipes
      .filter(({ keepsQuality }) => keepsQuality === true)
      .flatMap((recipe) => [recipe, ...recipe.alternatives])
      .flatMap(({ materials }) => materials.map(({ id }) => id)),
  );
  return [...ids].flatMap((id) => RECIPES_BY_ID.get(id) ?? []);
}

// Each base item priced at what crafting one costs, in place of its market
// price, as old as the oldest price that went into it. One that can't be
// worked out keeps its market price. The craft cost already has its own
// materials' setup fees, so its buy-order price is set to come back to the
// craft cost once a setup fee is added to it.
interface OrderPrices<Price> {
  sellMin: Price;
  buyMax: Price;
}

function craftedPrice(
  value: number,
  seen: NonNullable<Craft["oldestMaterialPrice"]>,
): UsedPrice {
  return {
    status: seen.status,
    value,
    observedAt: seen.observedAt,
    ageMinutes: seen.ageMinutes,
    origin: "api",
    crafted: true,
  };
}

export function atCraftCost(
  prices: UsedPrices,
  baseCrafts: readonly Craft[],
): UsedPrices {
  const crafted = new Map(
    baseCrafts.flatMap((craft): [string, OrderPrices<UsedPrice>][] => {
      const cost = craftCost(craft);
      const seen = craft.oldestMaterialPrice;
      return cost === undefined || seen === undefined
        ? []
        : [
            [
              craft.itemId,
              {
                sellMin: craftedPrice(Math.round(cost), seen),
                buyMax: craftedPrice(Math.round(cost) / (1 + SETUP_FEE), seen),
              },
            ],
          ];
    }),
  );
  return {
    ...prices,
    materials: prices.materials.map((row) => {
      const price = crafted.get(row.itemId);
      return price === undefined ? row : { ...row, ...price };
    }),
  };
}
