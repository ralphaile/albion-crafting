import { z } from "zod";

import { craftingLocations, hideouts } from "@aoc/crafting-data";

import { REFINED_MATERIALS } from "./material-markets.constants";
import {
  BUY_MARKET_GROUPS,
  DEFAULT_ROUTE_CHOICE,
  SELL_MARKET_GROUPS,
} from "./route.constants";
import type { OptionGroup, RouteChoice } from "./route.types";

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

function ids(groups: readonly OptionGroup[]) {
  return groups.flatMap(({ options }) => options.map(({ id }) => id));
}

export const BUY_MARKET_IDS = ids(BUY_MARKET_GROUPS);
export const SELL_MARKET_IDS = ids(SELL_MARKET_GROUPS);

const buyMarket = (fallback: string) =>
  z.string().refine(oneOf(BUY_MARKET_IDS)).catch(fallback);

// Each material falls back on its own, so a route saved before one was added
// keeps the others.
const materialMarketsSchema = z.object(
  Object.fromEntries(
    REFINED_MATERIALS.map(({ id }) => [
      id,
      buyMarket(DEFAULT_ROUTE_CHOICE.materialMarkets[id]),
    ]),
  ) as Record<
    keyof RouteChoice["materialMarkets"],
    ReturnType<typeof buyMarket>
  >,
);

const routeSchema = z.object({
  place: placeSchema.catch(DEFAULT_ROUTE_CHOICE.place),
  buyMarketId: buyMarket(DEFAULT_ROUTE_CHOICE.buyMarketId),
  materialMarkets: materialMarketsSchema.catch(
    DEFAULT_ROUTE_CHOICE.materialMarkets,
  ),
  sellMarketId: z
    .string()
    .refine(oneOf(SELL_MARKET_IDS))
    .catch(DEFAULT_ROUTE_CHOICE.sellMarketId),
});

// Each part that doesn't fit falls back to the default route's, so a bad link
// or an old save never stops the app from opening.
export function parseRoute(raw: unknown): RouteChoice {
  const parsed = routeSchema.safeParse(raw);
  return parsed.success ? parsed.data : DEFAULT_ROUTE_CHOICE;
}
