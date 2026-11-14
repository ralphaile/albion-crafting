import type { CraftingPlace, EvaluateSettings } from "@aoc/core";
import { craftingLocations, hideouts } from "@aoc/crafting-data";
import { markets } from "@aoc/market-prices";

import type {
  HideoutChoice,
  OptionGroup,
  PlaceChoice,
  RoadsChoice,
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

export function marketName(id: string): string {
  return markets.find((market) => market.id === id)?.name ?? id;
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

// The biome of the royal city you were crafting in, if any.
export function defaultHideoutFor(place: PlaceChoice): HideoutChoice {
  const locationId = place.kind === "location" ? place.locationId : undefined;
  return {
    kind: "hideout",
    biomeId:
      hideouts.biomes.find(({ cityId }) => cityId === locationId)?.id ??
      FIRST_BIOME_ID,
    quality: BEST_MAP_QUALITY,
    level: BEST_POWER_LEVEL,
  };
}

export function defaultRoadsHideout(): RoadsChoice {
  return {
    kind: "roads",
    zoneId: found(hideouts.roadsZones, () => true).id,
    level: BEST_POWER_LEVEL,
  };
}

function powerLevel(level: number) {
  return found(hideouts.powerLevels, (row) => row.level === level);
}

function roadsZone(zoneId: string) {
  return found(hideouts.roadsZones, ({ id }) => id === zoneId);
}

// A Roads zone works like a Black Zone biome at a map quality of its own,
// with a refining bonus and a refined resource of its own.
export function placeFromChoice(choice: PlaceChoice): CraftingPlace {
  if (choice.kind === "location") {
    return {
      location: found(craftingLocations, ({ id }) => id === choice.locationId),
    };
  }
  if (choice.kind === "roads") {
    const zone = roadsZone(choice.zoneId);
    return {
      hideout: {
        biome: { specialties: zone.specialties },
        mapQuality: { specialtyBonus: zone.specialtyBonus },
        powerLevel: powerLevel(choice.level),
        refiningBonus: zone.refiningBonus,
        refiningSpecialties: zone.refiningSpecialties,
      },
    };
  }
  return {
    hideout: {
      biome: found(hideouts.biomes, ({ id }) => id === choice.biomeId),
      mapQuality: found(
        hideouts.mapQualities,
        ({ quality }) => quality === choice.quality,
      ),
      powerLevel: powerLevel(choice.level),
      refiningBonus: hideouts.refiningBonus,
    },
  };
}

export function routeFromChoice({ place, ...markets }: RouteChoice): Route {
  return { ...markets, place: placeFromChoice(place) };
}

// A sell-only market like the Black Market has no sell orders, only buy orders.
export function sellsOnlyToBuyOrders(marketId: string): boolean {
  return markets.some(
    ({ id, sellOnly }) => id === marketId && sellOnly === true,
  );
}

export function settingsForRoute(
  settings: EvaluateSettings,
  route: Route,
): EvaluateSettings {
  return sellsOnlyToBuyOrders(route.sellMarketId)
    ? { ...settings, sellMode: "blackMarket" }
    : settings;
}

// What the plan calls a crafting place, such as "Lymhurst" or
// "Forest hideout, Q6, level 9" or "Quatun-Nusas hideout, level 9".
export function placeName(choice: PlaceChoice): string {
  if (choice.kind === "location") {
    return found(craftingLocations, ({ id }) => id === choice.locationId).name;
  }
  if (choice.kind === "roads") {
    return `${roadsZone(choice.zoneId).name} hideout, level ${String(choice.level)}`;
  }
  const biome = found(hideouts.biomes, ({ id }) => id === choice.biomeId);
  return `${biome.name} hideout, Q${String(choice.quality)}, level ${String(choice.level)}`;
}
