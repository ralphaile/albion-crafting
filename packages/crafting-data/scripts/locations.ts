import type { Dumps } from "./validate.ts";
import type { CraftingLocation } from "../src/location.ts";

type CraftingModifiers = Dumps["craftingmodifiers.json"]["craftingmodifiers"];
type Clusters = Dumps["formatted/world.json"];

interface ExtractedLocations {
  locations: CraftingLocation[];
  warnings: string[];
}

export function extractLocations(
  { refiningcategory, craftinglocation }: CraftingModifiers,
  clusters: Clusters,
): ExtractedLocations {
  const refining = new Set(
    refiningcategory.item.map((item) => item["@category"]),
  );
  const clusterNames = new Map(
    clusters.map(({ Index, UniqueName }) => [Index, UniqueName]),
  );

  const locations: CraftingLocation[] = [];
  const islandBonuses = new Set<number>();
  const unnamed: string[] = [];
  for (const location of craftinglocation) {
    const id = location["@clusterid"];
    const bonus = location.craftingbonus;
    if (id === undefined || bonus === undefined) {
      continue;
    }
    const name = clusterNames.get(id);
    if (name === undefined) {
      unnamed.push(id);
    }
    islandBonuses.add(bonus["@islandvalue"]);
    locations.push({
      id,
      name: name ?? id,
      craftingBonus: bonus["@value"],
      specialties: Object.fromEntries(
        location.craftingmodifier
          .filter((modifier) => !refining.has(modifier["@name"]))
          .map((modifier) => [modifier["@name"], modifier["@value"]]),
      ),
    });
  }

  const [islandBonus, ...otherIslandBonuses] = [...islandBonuses];
  if (islandBonus === undefined || otherIslandBonuses.length > 0) {
    throw new Error(
      `Expected the cities and Rests to give islands one crafting bonus, but found ${
        islandBonus === undefined ? "none" : [...islandBonuses].join(", ")
      }`,
    );
  }
  locations.push({
    id: "island",
    name: "Island",
    craftingBonus: islandBonus,
    specialties: {},
  });

  return {
    locations,
    warnings:
      unnamed.length === 0
        ? []
        : [
            `No name in formatted/world.json for these clusters, so the app shows their IDs: ${unnamed.join(", ")}`,
          ],
  };
}
