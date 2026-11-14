import { REFINED_MATERIALS } from "./material-markets.constants";
import { parseRoute } from "./route.schema";
import type { RouteChoice } from "./route.types";
import { wholeNumber } from "./search-params.helpers";

const PARAMS = [
  "place",
  "biome",
  "zone",
  "quality",
  "level",
  "buy",
  ...REFINED_MATERIALS.map(({ param }) => param),
  "sell",
];

const HIDEOUT = "hideout";
const ROADS = "roads";

function placeFromParams(params: URLSearchParams) {
  const place = params.get("place");
  if (place === HIDEOUT) {
    return {
      kind: "hideout",
      biomeId: params.get("biome"),
      quality: wholeNumber(params, "quality"),
      level: wholeNumber(params, "level"),
    };
  }
  if (place === ROADS) {
    return {
      kind: "roads",
      zoneId: params.get("zone"),
      level: wholeNumber(params, "level"),
    };
  }
  return { kind: "location", locationId: place };
}

// Undefined when the link carries no route, so the saved one can apply.
export function routeFromSearch(search: string): RouteChoice | undefined {
  const params = new URLSearchParams(search);
  if (!PARAMS.some((name) => params.has(name))) {
    return undefined;
  }
  return parseRoute({
    place: placeFromParams(params),
    buyMarketId: params.get("buy"),
    materialMarkets: Object.fromEntries(
      REFINED_MATERIALS.map(({ id, param }) => [id, params.get(param)]),
    ),
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
  } else if (place.kind === "roads") {
    params.set("place", ROADS);
    params.set("zone", place.zoneId);
    params.set("level", String(place.level));
  } else {
    params.set("place", place.locationId);
  }
  params.set("buy", route.buyMarketId);
  for (const { id, param } of REFINED_MATERIALS) {
    params.set(param, route.materialMarkets[id]);
  }
  params.set("sell", route.sellMarketId);
  return `?${params.toString()}`;
}
