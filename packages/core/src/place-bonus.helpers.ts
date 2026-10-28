import type { CraftingPlace } from "./evaluate.types.js";
import { hideoutProductionBonus } from "./hideout-bonus.helpers.js";
import type { HideoutProductionBonus } from "./hideout-bonus.types.js";
import { productionBonus } from "./production-bonus.helpers.js";
import type {
  ProductionBonus,
  ProductionBonusOptions,
} from "./production-bonus.types.js";

export function placeProductionBonus(
  place: CraftingPlace,
  craftingCategory: string | undefined,
  options: ProductionBonusOptions = {},
): ProductionBonus | HideoutProductionBonus {
  return "hideout" in place
    ? hideoutProductionBonus(place.hideout, craftingCategory, options)
    : productionBonus(place.location, craftingCategory, options);
}
