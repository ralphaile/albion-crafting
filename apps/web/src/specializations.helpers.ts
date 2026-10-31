import { type FceParts, specializationFce } from "@aoc/core";
import { type GameRecipe, recipes, specializationOf } from "@aoc/crafting-data";

import type {
  SpecializationProfile,
  TreeLevels,
} from "./specializations.types";

const recipesById = new Map(recipes.map((recipe) => [recipe.itemId, recipe]));

const NO_LEVELS: TreeLevels = { mastery: 0, specializations: {} };

export function treeLevels(
  profile: SpecializationProfile,
  treeId: string,
): TreeLevels {
  return profile[treeId] ?? NO_LEVELS;
}

// Sets the tree's mastery, or one of its specializations, and leaves out
// whatever ends up at 0.
export function withLevel(
  profile: SpecializationProfile,
  treeId: string,
  specializationId: string | undefined,
  level: number,
): SpecializationProfile {
  const tree = treeLevels(profile, treeId);
  const mastery = specializationId === undefined ? level : tree.mastery;
  const specializations = Object.fromEntries(
    Object.entries(
      specializationId === undefined
        ? tree.specializations
        : { ...tree.specializations, [specializationId]: level },
    ).filter(([, value]) => value > 0),
  );
  const rest = Object.fromEntries(
    Object.entries(profile).filter(([id]) => id !== treeId),
  );
  return mastery > 0 || Object.keys(specializations).length > 0
    ? { ...rest, [treeId]: { mastery, specializations } }
    : rest;
}

// The item's own specialization, its tree's mastery, and the tree's other
// specializations.
export function fceParts(
  profile: SpecializationProfile,
  recipe: Pick<GameRecipe, "shopSubcategory" | "baseId">,
): FceParts {
  const { treeId, specializationId } = specializationOf(recipe);
  const { mastery, specializations } = treeLevels(profile, treeId);
  return specializationFce({
    mastery,
    spec: specializations[specializationId] ?? 0,
    otherSpecs: Object.entries(specializations)
      .filter(([id]) => id !== specializationId)
      .map(([, level]) => level),
  });
}

export function fceFor(
  profile: SpecializationProfile,
): (itemId: string) => number {
  return (itemId) => {
    const recipe = recipesById.get(itemId);
    return recipe === undefined ? 0 : fceParts(profile, recipe).total;
  };
}
