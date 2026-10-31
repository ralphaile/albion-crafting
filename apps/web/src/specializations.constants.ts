import { CATEGORIES } from "./filters.constants";
import type { OptionGroup } from "./route.types";
import type { SpecializationProfile } from "./specializations.types";

export const MAX_SPECIALIZATION_LEVEL = 100;

export const NO_SPECIALIZATIONS: SpecializationProfile = {};

function trees(label: string, ids: readonly string[]): OptionGroup {
  return {
    label,
    options: ids.flatMap((id) =>
      CATEGORIES.filter((category) => category.id === id),
    ),
  };
}

// The crafting trees, by the building that crafts them.
export const TREE_GROUPS: readonly OptionGroup[] = [
  trees("Warrior's Forge", [
    "sword",
    "axe",
    "mace",
    "hammer",
    "crossbow",
    "knuckles",
    "plate_armor",
    "plate_helmet",
    "plate_shoes",
    "shieldtype",
  ]),
  trees("Hunter's Lodge", [
    "bow",
    "spear",
    "naturestaff",
    "dagger",
    "quarterstaff",
    "shapeshifterstaff",
    "leather_armor",
    "leather_helmet",
    "leather_shoes",
    "torchtype",
  ]),
  trees("Mage's Tower", [
    "firestaff",
    "holystaff",
    "arcanestaff",
    "froststaff",
    "cursestaff",
    "cloth_armor",
    "cloth_helmet",
    "cloth_shoes",
    "booktype",
  ]),
];

export const FIRST_TREE_ID: string = TREE_GROUPS[0]?.options[0]?.id ?? "";
