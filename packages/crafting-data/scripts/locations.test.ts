import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { type Dumps, validate } from "./dumps.schema.ts";
import { extractLocations } from "./locations.helpers.ts";

type CraftingModifiers = Dumps["craftingmodifiers.json"]["craftingmodifiers"];
type Location = CraftingModifiers["craftinglocation"][number];

const fixtures = fileURLToPath(
  new URL("../test/fixtures/dumps", import.meta.url),
);

async function fixtureLocations() {
  const dumps = await validate(fixtures);
  return extractLocations(
    dumps["craftingmodifiers.json"].craftingmodifiers,
    dumps["formatted/world.json"],
  );
}

function city(clusterId: string, islandBonus: number): Location {
  return {
    "@clusterid": clusterId,
    craftingbonus: { "@value": 0.18, "@islandvalue": islandBonus },
    refiningbonus: { "@value": 0.18 },
    craftingmodifier: [{ "@name": "sword", "@value": 0.15 }],
  };
}

function only(...craftinglocation: Location[]): CraftingModifiers {
  return { refiningcategory: { item: [] }, craftinglocation };
}

describe("extractLocations", () => {
  it("gives each city and Rest its name, crafting bonus and specialties, without the refining ones", async () => {
    const { locations, warnings } = await fixtureLocations();

    expect(locations.slice(0, 2)).toEqual([
      {
        id: "0000",
        name: "Thetford",
        craftingBonus: 0.18,
        specialties: {
          meat_pig: 0.1,
          mace: 0.15,
          naturestaff: 0.15,
          firestaff: 0.15,
          leather_armor: 0.15,
          cloth_helmet: 0.15,
        },
      },
      {
        id: "4300",
        name: "Arthur's Rest",
        craftingBonus: 0.18,
        specialties: {
          axe: 0.15,
          crossbow: 0.15,
          hammer: 0.15,
          mace: 0.15,
          sword: 0.15,
          knuckles: 0.15,
          plate_helmet: 0.15,
          plate_armor: 0.15,
          plate_shoes: 0.15,
        },
      },
    ]);
    expect(warnings).toEqual([]);
  });

  it("leaves out the locations with no crafting bonus, and adds the island with no specialties", async () => {
    const { locations } = await fixtureLocations();

    expect(locations.map(({ id }) => id)).toEqual(["0000", "4300", "island"]);
    expect(locations.at(-1)).toEqual({
      id: "island",
      name: "Island",
      craftingBonus: 0,
      specialties: {},
    });
  });

  it("warns about a cluster with no name, and uses its ID", () => {
    const { locations, warnings } = extractLocations(only(city("9999", 0)), []);

    expect(locations[0]?.name).toBe("9999");
    expect(warnings).toEqual([
      "No name in formatted/world.json for these clusters, so the app shows their IDs: 9999",
    ]);
  });

  it("fails when the cities and Rests give islands different bonuses", () => {
    expect(() =>
      extractLocations(only(city("0000", 0), city("1000", 0.05)), []),
    ).toThrow(
      "Expected the cities and Rests to give islands one crafting bonus, but found 0, 0.05",
    );
  });

  it("fails when no location has a crafting bonus", () => {
    expect(() => extractLocations(only(), [])).toThrow(
      "Expected the cities and Rests to give islands one crafting bonus, but found none",
    );
  });
});
