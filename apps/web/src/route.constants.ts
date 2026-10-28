import { craftingLocations } from "@aoc/crafting-data";
import { markets } from "@aoc/market-prices";

import { optionGroups, routeFromChoice } from "./route.helpers";
import type { OptionGroup, Route, RouteChoice } from "./route.types";

const LYMHURST_ID = "1000";

export const DEFAULT_ROUTE_CHOICE: RouteChoice = {
  place: { kind: "location", locationId: LYMHURST_ID },
  buyMarketId: "Lymhurst",
  sellMarketId: "Lymhurst",
};

export const DEFAULT_ROUTE: Route = routeFromChoice(DEFAULT_ROUTE_CHOICE);

const ROYAL_CITIES = {
  label: "Royal cities",
  names: ["Thetford", "Lymhurst", "Bridgewatch", "Martlock", "Fort Sterling"],
};
const CAERLEON_AND_BRECILIEN = {
  label: "Caerleon and Brecilien",
  names: ["Caerleon", "Brecilien"],
};
const RESTS = ["Arthur's Rest", "Merlyn's Rest", "Morgana's Rest"];

export const LOCATION_GROUPS: readonly OptionGroup[] = optionGroups(
  [
    ROYAL_CITIES,
    CAERLEON_AND_BRECILIEN,
    { label: "Rests", names: RESTS },
    { label: "Islands", names: ["Island"] },
  ],
  craftingLocations,
);

const BLACK_ZONE_MARKETS = {
  label: "Black Zone (sparse data — manual prices likely)",
  names: RESTS,
};

export const BUY_MARKET_GROUPS: readonly OptionGroup[] = optionGroups(
  [ROYAL_CITIES, CAERLEON_AND_BRECILIEN],
  markets,
);

export const SELL_MARKET_GROUPS: readonly OptionGroup[] = optionGroups(
  [
    ROYAL_CITIES,
    CAERLEON_AND_BRECILIEN,
    { label: "Black Market", names: ["Black Market"] },
    BLACK_ZONE_MARKETS,
  ],
  markets,
);
