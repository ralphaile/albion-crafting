import type { CraftingTree, Specialization } from "./crafting-tree.types.js";
import {
  specializationName,
  specializationOf,
} from "./crafting-trees.helpers.js";
import { recipes } from "./game-data.constants.js";
import { itemName } from "./items.helpers.js";

interface Entry extends Specialization {
  isArtifact: boolean;
  tier: number;
}

function byPlainThenName(a: Entry, b: Entry) {
  return (
    Number(a.isArtifact) - Number(b.isArtifact) || a.name.localeCompare(b.name)
  );
}

function trees(): CraftingTree[] {
  const entries = new Map<string, Map<string, Entry>>();
  // Royal items cost no focus, so no FCE applies to them.
  for (const recipe of recipes.filter(({ focus }) => focus > 0)) {
    const { treeId, specializationId } = specializationOf(recipe);
    const tree = entries.get(treeId) ?? new Map<string, Entry>();
    entries.set(treeId, tree);
    const known = tree.get(specializationId);
    if (known === undefined || recipe.tier < known.tier) {
      tree.set(specializationId, {
        id: specializationId,
        name: specializationName(itemName(recipe.baseId)),
        isArtifact: recipe.isArtifact,
        tier: recipe.tier,
      });
    }
  }
  return [...entries].map(([id, tree]) => ({
    id,
    specializations: [...tree.values()]
      .sort(byPlainThenName)
      .map(({ id: specId, name }) => ({ id: specId, name })),
  }));
}

export const craftingTrees: readonly CraftingTree[] = trees();
