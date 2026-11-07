import type { CraftingTree, Specialization } from "./crafting-tree.types.js";
import {
  specializationName,
  specializationOf,
} from "./crafting-trees.helpers.js";
import { recipes, refiningRecipes } from "./game-data.constants.js";
import { itemName } from "./items.helpers.js";

interface Entry extends Specialization {
  isArtifact: boolean;
  refining: boolean;
  tier: number;
}

// Refining's specializations are its tiers, so they go lowest first.
function byPlainThenName(a: Entry, b: Entry) {
  return (
    Number(a.isArtifact) - Number(b.isArtifact) ||
    (a.refining ? a.tier - b.tier : 0) ||
    a.name.localeCompare(b.name)
  );
}

function trees(): CraftingTree[] {
  const entries = new Map<string, Map<string, Entry>>();
  // Royal items cost no focus, so no FCE applies to them.
  for (const recipe of [...recipes, ...refiningRecipes].filter(
    ({ focus }) => focus > 0,
  )) {
    const { treeId, specializationId } = specializationOf(recipe);
    const tree = entries.get(treeId) ?? new Map<string, Entry>();
    entries.set(treeId, tree);
    const known = tree.get(specializationId);
    if (known === undefined || recipe.tier < known.tier) {
      tree.set(specializationId, {
        id: specializationId,
        name: specializationName(itemName(recipe.baseId)),
        itemId: recipe.baseId,
        isArtifact: recipe.isArtifact,
        refining: recipe.refining ?? false,
        tier: recipe.tier,
      });
    }
  }
  return [...entries].map(([id, tree]) => ({
    id,
    specializations: [...tree.values()]
      .sort(byPlainThenName)
      .map(({ id: specId, name, itemId }) => ({ id: specId, name, itemId })),
  }));
}

export const craftingTrees: readonly CraftingTree[] = trees();
