import { parseFilters } from "./filters.schema";
import type { Filters } from "./filters.types";
import { parseRoute } from "./route.schema";
import type { RouteChoice } from "./route.types";
import type { SavedSetting } from "./saved-settings.types";
import { parseSettings } from "./settings.schema";
import type { CraftingSettings } from "./settings.types";
import { parseSpecializations } from "./specializations.schema";
import type { SpecializationProfile } from "./specializations.types";

export const FILTERS_SETTING: SavedSetting<Filters> = {
  id: "filters",
  version: 1,
  parse: parseFilters,
};

export const ROUTE_SETTING: SavedSetting<RouteChoice> = {
  id: "route",
  version: 1,
  parse: parseRoute,
};

export const CRAFTING_SETTING: SavedSetting<CraftingSettings> = {
  id: "crafting",
  version: 1,
  parse: parseSettings,
};

export const SPECIALIZATIONS_SETTING: SavedSetting<SpecializationProfile> = {
  id: "specializations",
  version: 1,
  parse: parseSpecializations,
};
