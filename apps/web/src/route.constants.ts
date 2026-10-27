import { routeFromChoice } from "./route.helpers";
import type { Route, RouteChoice } from "./route.types";

export const DEFAULT_ROUTE_CHOICE: RouteChoice = {
  place: { kind: "location", locationId: "1000" },
  buyMarketId: "Lymhurst",
  sellMarketId: "Lymhurst",
};

export const DEFAULT_ROUTE: Route = routeFromChoice(DEFAULT_ROUTE_CHOICE);
