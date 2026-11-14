import type { Dumps } from "./dumps.schema.ts";
import { FAME_PER_MATERIAL } from "./journals.constants.ts";
import type { GameRecipe } from "../src/recipe.types.ts";

type Items = Dumps["items.json"]["items"];

// Gives each recipe the laborer's journal its crafting fame fills, such as
// T5_JOURNAL_WARRIOR for a 5.x broadsword, when one takes it. A journal names
// the base items of its own tier it takes. The fame counts the materials that
// come back, so not an artifact or a royal sigil, and an artifact item's own
// factor raises it.
export function addJournals(recipes: GameRecipe[], items: Items): GameRecipe[] {
  const journals = new Map<string, { id: string; capacity: number }>();
  for (const journal of items.journalitem) {
    for (const valid of journal.famefillingmissions?.craftitemfame?.validitem ??
      []) {
      journals.set(valid["@id"], {
        id: journal["@uniquename"],
        capacity: journal["@maxfame"],
      });
    }
  }
  const factors = new Map(
    [
      ...items.weapon,
      ...items.equipmentitem,
      ...items.transformationweapon,
    ].map((item) => [
      item["@uniquename"],
      item["@destinyandjournalcraftfamefactor"] ?? 1,
    ]),
  );

  return recipes.map((recipe) => {
    const journal = journals.get(recipe.baseId);
    const famePerMaterial = FAME_PER_MATERIAL.get(recipe.tier);
    const materials = recipe.materials
      .filter(({ returnable }) => returnable)
      .reduce((total, { count }) => total + count, 0);
    if (
      journal === undefined ||
      famePerMaterial === undefined ||
      materials === 0
    ) {
      return recipe;
    }
    const fame =
      materials *
      famePerMaterial *
      2 ** recipe.enchant *
      (factors.get(recipe.baseId) ?? 1);
    return {
      ...recipe,
      journal: { ...journal, fame: Math.round(fame * 100) / 100 },
    };
  });
}
