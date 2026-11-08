import { craftingLocations, refiningRecipes } from "@aoc/crafting-data";
import { markets } from "@aoc/market-prices";

import type { MaterialMarkets, RefinedMaterial } from "./route.types";

// `param` names the material's market in a link.
export const REFINED_MATERIALS: readonly {
  id: RefinedMaterial;
  label: string;
  param: string;
}[] = [
  { id: "metalbars", label: "Metal bars", param: "bars" },
  { id: "planks", label: "Planks", param: "planks" },
  { id: "cloth", label: "Cloth", param: "cloth" },
  { id: "leather", label: "Leather", param: "leather" },
];

// The market of the city whose refining bonus is for what `material` is
// refined from, such as Thetford's for ore and so metal bars.
function refiningCity(material: RefinedMaterial): string {
  const category = refiningRecipes.find(
    ({ shopSubcategory }) => shopSubcategory === material,
  )?.craftingCategory;
  const city = craftingLocations.find(
    ({ refiningSpecialties }) =>
      category !== undefined && (refiningSpecialties[category] ?? 0) > 0,
  );
  const market = markets.find(({ name }) => name === city?.name);
  if (market === undefined) {
    throw new Error(`No city refines ${material} with a bonus`);
  }
  return market.id;
}

export const REFINING_CITY_MARKETS: MaterialMarkets = {
  metalbars: refiningCity("metalbars"),
  planks: refiningCity("planks"),
  cloth: refiningCity("cloth"),
  leather: refiningCity("leather"),
};
