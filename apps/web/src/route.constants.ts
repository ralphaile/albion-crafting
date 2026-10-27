import { craftingLocations } from "@aoc/crafting-data";

import type { Route } from "./route.types";

const lymhurst = craftingLocations.find(({ name }) => name === "Lymhurst");
if (lymhurst === undefined) {
  throw new Error("Lymhurst is missing from the crafting locations");
}

export const DEFAULT_ROUTE: Route = {
  place: { location: lymhurst },
  buyMarketId: "Lymhurst",
  sellMarketId: "Lymhurst",
};
