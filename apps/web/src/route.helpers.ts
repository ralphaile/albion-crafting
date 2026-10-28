import type { CraftingPlace, EvaluateSettings } from "@aoc/core";
import { craftingLocations, hideouts } from "@aoc/crafting-data";
import { markets } from "@aoc/market-prices";

import type {
  HideoutChoice,
  LocationChoice,
  OptionGroup,
  PlaceChoice,
  Route,
  RouteChoice,
} from "./route.types";

const FIRST_BIOME_ID = "SWAMP";
const BEST_MAP_QUALITY = 6;
const BEST_POWER_LEVEL = 9;

function found<T>(rows: readonly T[], matches: (row: T) => boolean): T {
  const row = rows.find(matches);
  if (row === undefined) {
    throw new Error("The route names a place the game data doesn't have");
  }
  return row;
}

export function optionGroups(
  groups: readonly { label: string; names: readonly string[] }[],
  rows: readonly { id: string; name: string }[],
): OptionGroup[] {
  return groups.map(({ label, names }) => ({
    label,
    options: names.map((name) => {
      const row = found(rows, (other) => other.name === name);
      return { id: row.id, label: row.name };
    }),
  }));
}

export function defaultHideoutFor({
  locationId,
}: LocationChoice): HideoutChoice {
  return {
    kind: "hideout",
    biomeId:
      hideouts.biomes.find(({ cityId }) => cityId === locationId)?.id ??
      FIRST_BIOME_ID,
    quality: BEST_MAP_QUALITY,
    level: BEST_POWER_LEVEL,
  };
}

export function placeFromChoice(choice: PlaceChoice): CraftingPlace {
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
