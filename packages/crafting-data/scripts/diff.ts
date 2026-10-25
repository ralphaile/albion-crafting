import type { Hideouts } from "../src/hideout.ts";
import type { Item } from "../src/item.ts";
import type { CraftingLocation } from "../src/location.ts";
import type { Alternative, Recipe } from "../src/recipe.ts";

export interface GeneratedData {
  recipes: readonly Recipe[];
  items: readonly Item[];
  locations: readonly CraftingLocation[];
  hideouts: Hideouts;
}

export interface Totals {
  added: number;
  removed: number;
  changed: number;
}

export interface DataDiff {
  totals: {
    items: Omit<Totals, "changed">;
    recipes: Totals;
    bonuses: Totals;
  };
  bonuses: string[];
  removedItems: string[];
  addedItems: string[];
  recipes: string[];
}

type Facts = Map<string, string>;

interface Change {
  key: string;
  before: string | undefined;
  after: string | undefined;
}

export function diffData(
  before: GeneratedData,
  after: GeneratedData,
): DataDiff {
  const names = new Map(
    [...before.items, ...after.items].map(({ id, name }) => [id, name]),
  );
  const label = (id: string) => {
    const name = names.get(id);
    return name === undefined ? `\`${id}\`` : `\`${id}\` ${name}`;
  };

  const bonusChanges = diffFacts(bonusFacts(before), bonusFacts(after));

  const itemsBefore = new Set(before.recipes.map(({ baseId }) => baseId));
  const itemsAfter = new Set(after.recipes.map(({ baseId }) => baseId));
  const removedItems = [...itemsBefore].filter((id) => !itemsAfter.has(id));
  const addedItems = [...itemsAfter].filter((id) => !itemsBefore.has(id));

  const recipesBefore = new Map(
    before.recipes.map((recipe) => [recipe.itemId, recipe]),
  );
  const recipesAfter = new Map(
    after.recipes.map((recipe) => [recipe.itemId, recipe]),
  );
  const recipes: Totals = { added: 0, removed: 0, changed: 0 };
  const recipeLines: string[] = [];
  for (const [itemId, recipe] of recipesAfter) {
    const old = recipesBefore.get(itemId);
    if (old === undefined) {
      recipes.added += 1;
      if (itemsBefore.has(recipe.baseId)) {
        recipeLines.push(`${label(itemId)}: new recipe`);
      }
      continue;
    }
    const changes = diffFacts(recipeFacts(old), recipeFacts(recipe));
    if (changes.length > 0) {
      recipes.changed += 1;
      recipeLines.push(
        `${label(itemId)}: ${changes
          .map((change) => `${change.key} ${describe(change)}`)
          .join(", ")}`,
      );
    }
  }
  for (const [itemId, recipe] of recipesBefore) {
    if (!recipesAfter.has(itemId)) {
      recipes.removed += 1;
      if (itemsAfter.has(recipe.baseId)) {
        recipeLines.push(`${label(itemId)}: recipe removed`);
      }
    }
  }

  return {
    totals: {
      items: { added: addedItems.length, removed: removedItems.length },
      recipes,
      bonuses: {
        added: bonusChanges.filter(({ before }) => before === undefined).length,
        removed: bonusChanges.filter(({ after }) => after === undefined).length,
        changed: bonusChanges.filter(
          ({ before, after }) => before !== undefined && after !== undefined,
        ).length,
      },
    },
    bonuses: bonusChanges.map((change) => `${change.key}: ${describe(change)}`),
    removedItems: removedItems.map(label),
    addedItems: addedItems.map(label),
    recipes: recipeLines,
  };
}

function diffFacts(before: Facts, after: Facts): Change[] {
  return [...new Set([...before.keys(), ...after.keys()])].flatMap((key) => {
    const old = before.get(key);
    const value = after.get(key);
    return old === value ? [] : [{ key, before: old, after: value }];
  });
}

function describe({ before, after }: Change): string {
  return `${before ?? "none"} → ${after ?? "none"}`;
}

function bonusFacts({ locations, hideouts }: GeneratedData): Facts {
  const facts: Facts = new Map();
  for (const { name, craftingBonus, specialties } of locations) {
    facts.set(`${name}, base`, String(craftingBonus));
    for (const [category, bonus] of Object.entries(specialties)) {
      facts.set(`${name}, ${category}`, String(bonus));
    }
  }
  for (const { name, cityId, specialties } of hideouts.biomes) {
    const city = locations.find(({ id }) => id === cityId);
    facts.set(`${name} biome, royal city`, city?.name ?? cityId);
    facts.set(`${name} biome, categories`, specialties.join(", "));
  }
  for (const { quality, specialtyBonus } of hideouts.mapQualities) {
    facts.set(
      `Hideout map quality Q${String(quality)}`,
      String(specialtyBonus),
    );
  }
  for (const { level, generalBonus, specialistBonus } of hideouts.powerLevels) {
    facts.set(
      `Hideout power level ${String(level)}, general`,
      String(generalBonus),
    );
    facts.set(
      `Hideout power level ${String(level)}, specialist`,
      String(specialistBonus),
    );
  }
  facts.set("Hideout refining", String(hideouts.refiningBonus));
  return facts;
}

function recipeFacts(recipe: Recipe): Facts {
  const facts: Facts = new Map();
  addAlternative(facts, "", recipe);
  recipe.alternatives.forEach((alternative, index) => {
    addAlternative(facts, `alternative ${String(index + 1)}, `, alternative);
  });
  if (recipe.itemValue !== undefined) {
    facts.set("item value", String(recipe.itemValue));
  }
  if (recipe.craftingCategory !== undefined) {
    facts.set("crafting category", recipe.craftingCategory);
  }
  facts.set("artifact", recipe.isArtifact ? "yes" : "no");
  return facts;
}

function addAlternative(
  facts: Facts,
  prefix: string,
  { focus, silver, amountCrafted, resources }: Alternative,
): void {
  facts.set(`${prefix}focus`, String(focus));
  facts.set(`${prefix}silver`, String(silver));
  facts.set(`${prefix}amount crafted`, String(amountCrafted));
  for (const { id, count, returnable } of resources) {
    facts.set(
      `${prefix}\`${id}\``,
      returnable ? String(count) : `${String(count)} (not returned)`,
    );
  }
}
