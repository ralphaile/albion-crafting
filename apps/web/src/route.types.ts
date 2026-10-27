import type { CraftingPlace } from "@aoc/core";

export type PlaceChoice =
  | { kind: "location"; locationId: string }
  | { kind: "hideout"; biomeId: string; quality: number; level: number };

// What the user picked, as IDs and numbers, so it can go in a link or be saved.
export interface RouteChoice {
  place: PlaceChoice;
  buyMarketId: string;
  sellMarketId: string;
}

export interface Route {
  place: CraftingPlace;
  buyMarketId: string;
  sellMarketId: string;
}
