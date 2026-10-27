import { type CraftingPlace, hasSpecialty } from "@aoc/core";
import { type GameRecipe, searchItems } from "@aoc/crafting-data";

import type { Craft } from "./best-crafts";
import { formatCount, formatSilver } from "./format";

export type ArtifactFilter = "include" | "exclude" | "only";

export interface Filters {
  tiers: readonly number[];
  enchants: readonly number[];
  categories: readonly string[];
  artifacts: ArtifactFilter;
  minProfit: number | undefined;
  minMarginPercent: number | undefined;
  hideIncomplete: boolean;
  specialtyOnly: boolean;
  search: string;
}

export const NO_FILTERS: Filters = {
  tiers: [],
  enchants: [],
  categories: [],
  artifacts: "include",
  minProfit: undefined,
  minMarginPercent: undefined,
  hideIncomplete: false,
  specialtyOnly: false,
  search: "",
};

export const TIERS: readonly number[] = [4, 5, 6, 7, 8];
export const ENCHANTS: readonly number[] = [0, 1, 2, 3, 4];

export interface Option {
  id: string;
  label: string;
}

export const WEAPON_TYPES: readonly Option[] = [
  { id: "arcanestaff", label: "Arcane staff" },
  { id: "axe", label: "Axe" },
  { id: "bow", label: "Bow" },
  { id: "crossbow", label: "Crossbow" },
  { id: "cursestaff", label: "Cursed staff" },
  { id: "dagger", label: "Dagger" },
  { id: "firestaff", label: "Fire staff" },
  { id: "froststaff", label: "Frost staff" },
  { id: "hammer", label: "Hammer" },
  { id: "holystaff", label: "Holy staff" },
  { id: "knuckles", label: "War gloves" },
  { id: "mace", label: "Mace" },
  { id: "naturestaff", label: "Nature staff" },
  { id: "quarterstaff", label: "Quarterstaff" },
  { id: "shapeshifterstaff", label: "Shapeshifter staff" },
  { id: "spear", label: "Spear" },
  { id: "sword", label: "Sword" },
];

export const ARMOR_MATERIALS: readonly Option[] = [
  { id: "cloth", label: "Cloth" },
  { id: "leather", label: "Leather" },
  { id: "plate", label: "Plate" },
];

export const ARMOR_SLOTS: readonly Option[] = [
  { id: "helmet", label: "Helmet" },
  { id: "armor", label: "Armor" },
  { id: "shoes", label: "Shoes" },
];

// Each piece is a shop subcategory of the game files, such as "plate_helmet".
export function armorPiece(material: Option, slot: Option): Option {
  return {
    id: `${material.id}_${slot.id}`,
    label: `${material.label} ${slot.label.toLowerCase()}`,
  };
}

const ARMOR_PIECES: readonly Option[] = ARMOR_MATERIALS.flatMap((material) =>
  ARMOR_SLOTS.map((slot) => armorPiece(material, slot)),
);

export const OFFHAND_TYPES: readonly Option[] = [
  { id: "booktype", label: "Tome" },
  { id: "shieldtype", label: "Shield" },
  { id: "torchtype", label: "Torch" },
];

export const CATEGORIES: readonly Option[] = [
  ...WEAPON_TYPES,
  ...ARMOR_PIECES,
  ...OFFHAND_TYPES,
];

export const MAX_SEARCH_LENGTH = 100;

function includesOrEmpty<T>(selected: readonly T[], value: T) {
  return selected.length === 0 || selected.includes(value);
}

function matchesArtifacts(recipe: GameRecipe, artifacts: ArtifactFilter) {
  switch (artifacts) {
    case "include":
      return true;
    case "exclude":
      return !recipe.isArtifact;
    case "only":
      return recipe.isArtifact;
  }
}

// What can be decided before any price is known, so only these recipes are priced.
export function recipeFilter(
  filters: Filters,
  place: CraftingPlace,
): (recipe: GameRecipe) => boolean {
  const query = filters.search.trim();
  const found = query === "" ? undefined : new Set(searchItems(query));
  return (recipe) =>
    includesOrEmpty(filters.tiers, recipe.tier) &&
    includesOrEmpty(filters.enchants, recipe.enchant) &&
    includesOrEmpty(filters.categories, recipe.shopSubcategory) &&
    matchesArtifacts(recipe, filters.artifacts) &&
    (!filters.specialtyOnly || hasSpecialty(place, recipe.craftingCategory)) &&
    (found === undefined || found.has(recipe.itemId));
}

// The minimums only judge crafts with every price. Whether the others show is
// up to hideIncomplete, so they can still be finished by hand.
export function craftFilter(filters: Filters): (craft: Craft) => boolean {
  const { minProfit, minMarginPercent, hideIncomplete } = filters;
  return (craft) => {
    if (craft.status === "incomplete") {
      return !hideIncomplete;
    }
    return (
      (minProfit === undefined || craft.profit >= minProfit) &&
      (minMarginPercent === undefined ||
        craft.margin === undefined ||
        craft.margin * 100 >= minMarginPercent)
    );
  };
}

export interface ActiveFilter {
  id: string;
  label: string;
  remove: (filters: Filters) => Filters;
}

function without<T>(values: readonly T[], value: T) {
  return values.filter((other) => other !== value);
}

const ARTIFACT_LABELS: Record<Exclude<ArtifactFilter, "include">, string> = {
  exclude: "No artifacts",
  only: "Artifacts only",
};

export function activeFilters(filters: Filters): ActiveFilter[] {
  const active: ActiveFilter[] = [
    ...filters.tiers.map((tier) => ({
      id: `tier-${String(tier)}`,
      label: `Tier ${String(tier)}`,
      remove: (current: Filters) => ({
        ...current,
        tiers: without(current.tiers, tier),
      }),
    })),
    ...filters.enchants.map((enchant) => ({
      id: `enchant-${String(enchant)}`,
      label: `Enchant .${String(enchant)}`,
      remove: (current: Filters) => ({
        ...current,
        enchants: without(current.enchants, enchant),
      }),
    })),
    ...filters.categories.map((category) => ({
      id: `category-${category}`,
      label:
        CATEGORIES.find((option) => option.id === category)?.label ?? category,
      remove: (current: Filters) => ({
        ...current,
        categories: without(current.categories, category),
      }),
    })),
  ];
  if (filters.artifacts !== "include") {
    active.push({
      id: "artifacts",
      label: ARTIFACT_LABELS[filters.artifacts],
      remove: (current) => ({ ...current, artifacts: "include" }),
    });
  }
  if (filters.minProfit !== undefined) {
    active.push({
      id: "min-profit",
      label: `Profit ≥ ${formatSilver(filters.minProfit)}`,
      remove: (current) => ({ ...current, minProfit: undefined }),
    });
  }
  if (filters.minMarginPercent !== undefined) {
    active.push({
      id: "min-margin",
      label: `Margin ≥ ${formatCount(filters.minMarginPercent)}%`,
      remove: (current) => ({ ...current, minMarginPercent: undefined }),
    });
  }
  if (filters.hideIncomplete) {
    active.push({
      id: "hide-incomplete",
      label: "No missing prices",
      remove: (current) => ({ ...current, hideIncomplete: false }),
    });
  }
  if (filters.specialtyOnly) {
    active.push({
      id: "specialty-only",
      label: "Specialty only",
      remove: (current) => ({ ...current, specialtyOnly: false }),
    });
  }
  if (filters.search.trim() !== "") {
    active.push({
      id: "search",
      label: `Name: ${filters.search.trim()}`,
      remove: (current) => ({ ...current, search: "" }),
    });
  }
  return active;
}
