import { refiningRecipes } from "@aoc/crafting-data";

import { REFINED_MATERIALS } from "./material-markets.constants";
import type {
  BuyMarkets,
  MarketChoice,
  MaterialMarkets,
  RefinedMaterial,
} from "./route.types";

const REFINED = new Set<string>(REFINED_MATERIALS.map(({ id }) => id));

function isRefined(subcategory: string): subcategory is RefinedMaterial {
  return REFINED.has(subcategory);
}

const REFINED_BY_ITEM = new Map(
  refiningRecipes.flatMap(({ itemId, shopSubcategory }) =>
    isRefined(shopSubcategory) ? [[itemId, shopSubcategory] as const] : [],
  ),
);

// The market a material is bought in: its pinned one, else its refined
// material's, else the one for everything else.
export function materialMarketId(
  { buyMarketId, materialMarkets, pins }: MarketChoice,
  itemId: string,
): string {
  const material = REFINED_BY_ITEM.get(itemId);
  return (
    pins[itemId] ??
    (material === undefined ? buyMarketId : materialMarkets[material])
  );
}

// `itemIds` grouped by the market each is bought in, in the order each market
// first comes up.
export function byMaterialMarket(
  markets: MarketChoice,
  itemIds: readonly string[],
): Map<string, string[]> {
  const grouped = new Map<string, string[]>();
  for (const itemId of itemIds) {
    const marketId = materialMarketId(markets, itemId);
    grouped.set(marketId, [...(grouped.get(marketId) ?? []), itemId]);
  }
  return grouped;
}

export function sameMaterialMarkets(
  a: MaterialMarkets,
  b: MaterialMarkets,
): boolean {
  return REFINED_MATERIALS.every(({ id }) => a[id] === b[id]);
}

export function sameBuyMarkets(a: BuyMarkets, b: BuyMarkets): boolean {
  return (
    a.buyMarketId === b.buyMarketId &&
    sameMaterialMarkets(a.materialMarkets, b.materialMarkets)
  );
}

export function everyMaterialIn(marketId: string): MaterialMarkets {
  return {
    metalbars: marketId,
    planks: marketId,
    cloth: marketId,
    leather: marketId,
  };
}
