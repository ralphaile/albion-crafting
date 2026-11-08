import type { CraftingPlace } from "@aoc/core";

import type { Option } from "./filters.types";
import type { MaterialPins } from "./material-pins.types";

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

// The refined materials bought in a market of their own, by their shop
// subcategory in the game files.
export type RefinedMaterial = "metalbars" | "planks" | "cloth" | "leather";

export type MaterialMarkets = Readonly<Record<RefinedMaterial, string>>;

// Where materials are bought: each refined material in its own market, and
// everything else in `buyMarketId`.
export interface BuyMarkets {
  buyMarketId: string;
  materialMarkets: MaterialMarkets;
}

// The route's buy markets with the pins, which win over them.
export interface MarketChoice extends BuyMarkets {
  pins: MaterialPins;
}

// What the user picked, as IDs and numbers, so it can go in a link or be saved.
export interface RouteChoice extends BuyMarkets {
  place: PlaceChoice;
  sellMarketId: string;
}

export interface Route extends BuyMarkets {
  place: CraftingPlace;
  sellMarketId: string;
}

export interface OptionGroup {
  label: string;
  options: readonly Option[];
}
