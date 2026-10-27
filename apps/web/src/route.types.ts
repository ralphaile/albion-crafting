import type { CraftingPlace } from "@aoc/core";

import type { Option } from "./filters.types";

export interface LocationChoice {
  kind: "location";
  locationId: string;
}

export interface HideoutChoice {
  kind: "hideout";
  biomeId: string;
  quality: number;
  level: number;
}

export type PlaceChoice = LocationChoice | HideoutChoice;

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

export interface OptionGroup {
  label: string;
  options: readonly Option[];
}
