import type { Dumps } from "./validate.ts";
import type { Item } from "../src/item.ts";
import type { GameRecipe } from "../src/recipe.ts";

type Names = Dumps["formatted/items.json"];

interface ExtractedItems {
  items: Item[];
  warnings: string[];
}

export function extractItems(
  recipes: GameRecipe[],
  names: Names,
): ExtractedItems {
  const englishNames = new Map(
    names.flatMap(({ UniqueName, LocalizedNames }) =>
      LocalizedNames === null
        ? []
        : [[UniqueName, LocalizedNames["EN-US"]] as const],
    ),
  );
  const craftedIds = new Set(recipes.map((recipe) => recipe.itemId));
  const ids = new Set([
    ...craftedIds,
    ...recipes.flatMap((recipe) =>
      [recipe, ...recipe.alternatives].flatMap(({ materials }) =>
        materials.map(({ id }) => id),
      ),
    ),
  ]);

  const items: Item[] = [];
  const unnamed: string[] = [];
  for (const id of [...ids].sort((a, b) => (a < b ? -1 : 1))) {
    const name = englishNames.get(id);
    if (name === undefined) {
      unnamed.push(id);
    } else if (craftedIds.has(id)) {
      items.push({ id, name: displayName(id, name), crafted: true });
    } else {
      items.push({ id, name: displayName(id, name) });
    }
  }
  return {
    items,
    warnings:
      unnamed.length === 0
        ? []
        : [
            `No EN-US name for ${String(unnamed.length)} item IDs, so the app shows the IDs: ${unnamed.join(", ")}`,
          ],
  };
}

function displayName(id: string, name: string): string {
  const tier = /^T(\d+)_/.exec(id)?.[1];
  if (tier === undefined) {
    return name;
  }
  const enchant = /@(\d+)$/.exec(id)?.[1] ?? "0";
  return `${name} ${tier}.${enchant}`;
}
