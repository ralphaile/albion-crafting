import type { CraftingLocation } from "@aoc/core";

import type { Dumps } from "./dumps.schema.ts";

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
  const islandRefiningBonuses = new Set<number>();
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
    islandRefiningBonuses.add(location.refiningbonus["@islandvalue"] ?? 0);
    const modifiers = (isRefining: boolean) =>
      Object.fromEntries(
        location.craftingmodifier
          .filter((modifier) => refining.has(modifier["@name"]) === isRefining)
          .map((modifier) => [modifier["@name"], modifier["@value"]]),
      );
    locations.push({
      id,
      name: name ?? id,
      craftingBonus: bonus["@value"],
      specialties: modifiers(false),
      refiningBonus: location.refiningbonus["@value"],
      refiningSpecialties: modifiers(true),
    });
  }

  locations.push({
    id: "island",
    name: "Island",
    craftingBonus: single(islandBonuses, "crafting"),
    specialties: {},
    refiningBonus: single(islandRefiningBonuses, "refining"),
    refiningSpecialties: {},
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

function single(bonuses: ReadonlySet<number>, kind: string): number {
  const [bonus, ...others] = [...bonuses];
  if (bonus === undefined || others.length > 0) {
    throw new Error(
      `Expected the cities and Rests to give islands one ${kind} bonus, but found ${
        bonus === undefined ? "none" : [...bonuses].join(", ")
      }`,
    );
  }
  return bonus;
}
