import type { CraftingPlace } from "@aoc/core";

export interface Route {
  place: CraftingPlace;
  buyMarketId: string;
  sellMarketId: string;
}
