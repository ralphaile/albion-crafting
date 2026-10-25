import type { Dumps } from "./validate.ts";
import type { Hideouts } from "../src/hideout.ts";
import type { CraftingLocation } from "../src/location.ts";

type CraftingModifiers = Dumps["craftingmodifiers.json"]["craftingmodifiers"];
type PowerLevels =
  Dumps["hideouts.json"]["hideouts"]["hideout"]["powerlevels"]["powerlevel"];

const BIOME_CITIES: Record<string, string> = {
  SWAMP: "Thetford",
  FOREST: "Lymhurst",
  STEPPE: "Bridgewatch",
  HIGHLAND: "Martlock",
  MOUNTAIN: "Fort Sterling",
};

export function extractHideouts(
  { craftinglocation }: CraftingModifiers,
  powerlevel: PowerLevels,
  craftingLocations: CraftingLocation[],
): Hideouts {
  const zones = craftinglocation.flatMap((location) => {
    const biome = location["@biome"];
    const quality = location["@clusterquality"];
    return biome === undefined || quality === undefined
      ? []
      : [
          {
            biome,
            quality,
            specialties: location.craftingmodifier.map(
              (modifier) => modifier["@name"],
            ),
            bonuses: location.craftingmodifier.map(
              (modifier) => modifier["@value"],
            ),
            refiningBonus: location.refiningbonus["@value"],
          },
        ];
  });

  return {
    biomes: unique(zones.map(({ biome }) => biome)).map((id) => ({
      id,
      name: id.charAt(0) + id.slice(1).toLowerCase(),
      cityId: royalCityId(id, craftingLocations),
      specialties: single(
        zones
          .filter(({ biome }) => biome === id)
          .map(({ specialties }) => specialties.join(", ")),
        `list of specialties in ${id}`,
      ).split(", "),
    })),
    mapQualities: unique(zones.map(({ quality }) => quality))
      .sort((a, b) => a - b)
      .map((quality) => ({
        quality,
        specialtyBonus: single(
          zones
            .filter((zone) => zone.quality === quality)
            .flatMap(({ bonuses }) => bonuses),
          `specialty bonus at map quality Q${String(quality)}`,
        ),
      })),
    powerLevels: powerlevel.map((level) => ({
      level: level["@level"],
      generalBonus: level["@generalistcraftingbonus"] ?? 0,
      specialistBonus: level["@specialistcraftingbonus"] ?? 0,
    })),
    refiningBonus: single(
      zones.map(({ refiningBonus }) => refiningBonus),
      "hideout refining bonus",
    ),
  };
}

function royalCityId(
  biome: string,
  craftingLocations: CraftingLocation[],
): string {
  const city = craftingLocations.find(
    ({ name }) => name === BIOME_CITIES[biome],
  );
  if (city === undefined) {
    throw new Error(`No royal city for the biome ${biome}`);
  }
  return city.id;
}

function single<T>(values: T[], what: string): T {
  const distinct = unique(values);
  const [value] = distinct;
  if (value === undefined || distinct.length > 1) {
    throw new Error(
      `Expected one ${what}, but found ${
        value === undefined ? "none" : distinct.join("; ")
      }`,
    );
  }
  return value;
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}
