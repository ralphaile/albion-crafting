import { routeFromChoice } from "./route.helpers";
import type { Route, RouteChoice } from "./route.types";

const LYMHURST_ID = "1000";

export const DEFAULT_ROUTE_CHOICE: RouteChoice = {
  place: { kind: "location", locationId: LYMHURST_ID },
  buyMarketId: "Lymhurst",
  sellMarketId: "Lymhurst",
};

export const DEFAULT_ROUTE: Route = routeFromChoice(DEFAULT_ROUTE_CHOICE);
