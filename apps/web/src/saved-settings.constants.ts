import { parseFilters } from "./filters.schema";
import type { Filters } from "./filters.types";
import { parsePins } from "./material-pins.schema";
import type { MaterialPins } from "./material-pins.types";
import { parsePlan } from "./plan.schema";
import type { CraftingPlan } from "./plan.types";
import { parseRecipeChoices } from "./recipe-choices.schema";
import type { RecipeChoices } from "./recipe-choices.types";
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

export const PLAN_SETTING: SavedSetting<CraftingPlan> = {
  id: "plan",
  version: 1,
  parse: parsePlan,
};

export const PINS_SETTING: SavedSetting<MaterialPins> = {
  id: "materialPins",
  version: 1,
  parse: parsePins,
};

export const RECIPE_CHOICES_SETTING: SavedSetting<RecipeChoices> = {
  id: "recipeChoices",
  version: 1,
  parse: parseRecipeChoices,
};
