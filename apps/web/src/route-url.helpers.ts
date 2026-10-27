import { parseRoute } from "./route.schema";
import type { RouteChoice } from "./route.types";
import { wholeNumber } from "./search-params.helpers";

const PARAMS = ["place", "biome", "quality", "level", "buy", "sell"];

const HIDEOUT = "hideout";

// Undefined when the link carries no route, so the saved one can apply.
export function routeFromSearch(search: string): RouteChoice | undefined {
  const params = new URLSearchParams(search);
  if (!PARAMS.some((name) => params.has(name))) {
    return undefined;
  }
  const place = params.get("place");
  return parseRoute({
    place:
      place === HIDEOUT
        ? {
            kind: "hideout",
            biomeId: params.get("biome"),
            quality: wholeNumber(params, "quality"),
            level: wholeNumber(params, "level"),
          }
        : { kind: "location", locationId: place },
    buyMarketId: params.get("buy"),
    sellMarketId: params.get("sell"),
  });
}

// Always writes the whole route, so a shared link shows the sender's route
// even to someone who saved another one. Keeps any other parameters.
export function searchWithRoute(search: string, route: RouteChoice): string {
  const params = new URLSearchParams(search);
  for (const name of PARAMS) {
    params.delete(name);
  }
  const { place } = route;
  if (place.kind === "hideout") {
    params.set("place", HIDEOUT);
    params.set("biome", place.biomeId);
    params.set("quality", String(place.quality));
    params.set("level", String(place.level));
  } else {
    params.set("place", place.locationId);
  }
  params.set("buy", route.buyMarketId);
  params.set("sell", route.sellMarketId);
  return `?${params.toString()}`;
}
