import { z } from "zod";

import { craftingLocations, hideouts } from "@aoc/crafting-data";
import { markets } from "@aoc/market-prices";

import { DEFAULT_ROUTE_CHOICE } from "./route.constants";
import type { RouteChoice } from "./route.types";

function oneOf<T>(allowed: readonly T[]) {
  return (value: T) => allowed.includes(value);
}

const placeSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("location"),
    locationId: z.string().refine(oneOf(craftingLocations.map(({ id }) => id))),
  }),
  z.object({
    kind: z.literal("hideout"),
    biomeId: z.string().refine(oneOf(hideouts.biomes.map(({ id }) => id))),
    quality: z
      .int()
      .refine(oneOf(hideouts.mapQualities.map(({ quality }) => quality))),
    level: z
      .int()
      .refine(oneOf(hideouts.powerLevels.map(({ level }) => level))),
  }),
]);

const buyMarketIds = markets
  .filter(({ sellOnly }) => sellOnly !== true)
  .map(({ id }) => id);
const sellMarketIds = markets.map(({ id }) => id);

const routeSchema = z.object({
  place: placeSchema.catch(DEFAULT_ROUTE_CHOICE.place),
  buyMarketId: z
    .string()
    .refine(oneOf(buyMarketIds))
    .catch(DEFAULT_ROUTE_CHOICE.buyMarketId),
  sellMarketId: z
    .string()
    .refine(oneOf(sellMarketIds))
    .catch(DEFAULT_ROUTE_CHOICE.sellMarketId),
});

// Each part that doesn't fit falls back to the default route's, so a bad link
// or an old save never stops the app from opening.
export function parseRoute(raw: unknown): RouteChoice {
  const parsed = routeSchema.safeParse(raw);
  return parsed.success ? parsed.data : DEFAULT_ROUTE_CHOICE;
}
