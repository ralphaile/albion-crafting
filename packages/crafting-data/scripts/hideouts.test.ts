import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import type { CraftingLocation } from "@aoc/core";

import { extractHideouts } from "./hideouts.ts";
import { extractLocations } from "./locations.ts";
import { type Dumps, validate } from "./validate.ts";

type CraftingModifiers = Dumps["craftingmodifiers.json"]["craftingmodifiers"];
type Location = CraftingModifiers["craftinglocation"][number];

const fixtures = fileURLToPath(
  new URL("../test/fixtures/dumps", import.meta.url),
);

const cities: CraftingLocation[] = [
  { id: "0000", name: "Thetford", craftingBonus: 0.18, specialties: {} },
  { id: "1000", name: "Lymhurst", craftingBonus: 0.18, specialties: {} },
];

function zone(
  biome: string,
  quality: number,
  bonus: number,
  { specialties = ["mace", "firestaff"], refiningBonus = 0.15 } = {},
): Location {
  return {
    "@biome": biome,
    "@clusterquality": quality,
    refiningbonus: { "@value": refiningBonus },
    craftingmodifier: specialties.map((name) => ({
      "@name": name,
      "@value": bonus,
    })),
  };
}

function hideoutsOf(...craftinglocation: Location[]) {
  return extractHideouts(
    { refiningcategory: { item: [] }, craftinglocation },
    [],
    cities,
  );
}

describe("extractHideouts", () => {
  it("makes one table each for the biomes, map qualities and power levels", async () => {
    const dumps = await validate(fixtures);
    const modifiers = dumps["craftingmodifiers.json"].craftingmodifiers;

    expect(
      extractHideouts(
        modifiers,
        dumps["hideouts.json"].hideouts.hideout.powerlevels.powerlevel,
        extractLocations(modifiers, dumps["formatted/world.json"]).locations,
      ),
    ).toEqual({
      biomes: [
        {
          id: "SWAMP",
          name: "Swamp",
          cityId: "0000",
          specialties: [
            "mace",
            "naturestaff",
            "firestaff",
            "leather_armor",
            "cloth_helmet",
          ],
        },
      ],
      mapQualities: [
        { quality: 1, specialtyBonus: 0.01 },
        { quality: 6, specialtyBonus: 0.26 },
      ],
      powerLevels: [
        { level: 1, generalBonus: 0, specialistBonus: 0 },
        { level: 2, generalBonus: 0.06, specialistBonus: 0.0375 },
        { level: 9, generalBonus: 0.26, specialistBonus: 0.3 },
      ],
      refiningBonus: 0.15,
    });
  });

  it.each([
    [
      "a map quality's bonus differs between biomes",
      zone("FOREST", 3, 0.12),
      "Expected one specialty bonus at map quality Q3, but found 0.11; 0.12",
    ],
    [
      "a biome's specialties differ between map qualities",
      zone("SWAMP", 4, 0.16, { specialties: ["mace"] }),
      "Expected one list of specialties in SWAMP, but found mace, firestaff; mace",
    ],
    [
      "the refining bonus differs",
      zone("SWAMP", 4, 0.16, { refiningBonus: 0.2 }),
      "Expected one hideout refining bonus, but found 0.15; 0.2",
    ],
  ])("fails when %s", (_, irregular, message) => {
    expect(() => hideoutsOf(zone("SWAMP", 3, 0.11), irregular)).toThrow(
      message,
    );
  });

  it("fails for a biome with no royal city", () => {
    expect(() => hideoutsOf(zone("TUNDRA", 1, 0.01))).toThrow(
      "No royal city for the biome TUNDRA",
    );
  });

  it("fails when the file has no hideout entries", () => {
    expect(() => hideoutsOf()).toThrow(
      "Expected one hideout refining bonus, but found none",
    );
  });
});
