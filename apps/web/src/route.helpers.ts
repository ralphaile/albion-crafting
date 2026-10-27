import type { CraftingPlace, EvaluateSettings } from "@aoc/core";
import { craftingLocations, hideouts } from "@aoc/crafting-data";
import { markets } from "@aoc/market-prices";

import type { PlaceChoice, Route, RouteChoice } from "./route.types";

function found<T>(rows: readonly T[], matches: (row: T) => boolean): T {
  const row = rows.find(matches);
  if (row === undefined) {
    throw new Error("The route names a place the game data doesn't have");
  }
  return row;
}

function placeFromChoice(choice: PlaceChoice): CraftingPlace {
  if (choice.kind === "location") {
    return {
      location: found(craftingLocations, ({ id }) => id === choice.locationId),
    };
  }
  return {
    hideout: {
      biome: found(hideouts.biomes, ({ id }) => id === choice.biomeId),
      mapQuality: found(
        hideouts.mapQualities,
        ({ quality }) => quality === choice.quality,
      ),
      powerLevel: found(
        hideouts.powerLevels,
        ({ level }) => level === choice.level,
      ),
    },
  };
}

export function routeFromChoice({
  place,
  buyMarketId,
  sellMarketId,
}: RouteChoice): Route {
  return { place: placeFromChoice(place), buyMarketId, sellMarketId };
}

// A sell-only market like the Black Market has no sell orders, only buy orders.
export function settingsForRoute(
  settings: EvaluateSettings,
  route: Route,
): EvaluateSettings {
  const sellOnly = markets.some(
    ({ id, sellOnly }) => id === route.sellMarketId && sellOnly === true,
  );
  return sellOnly ? { ...settings, sellMode: "blackMarket" } : settings;
}
