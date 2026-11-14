import {
  type BuyMode,
  type EnchantPaths,
  enchantPaths,
  materialCost,
} from "@aoc/core";
import type { GameRecipe } from "@aoc/crafting-data";

import type {
  Craft,
  UpgradeMaterial,
  UsedItemPrices,
  UsedPrice,
} from "./best-crafts.types";
import type { RecipeChoices } from "./recipe-choices.types";
import { RECIPES_BY_ID } from "./recipes.constants";

const MISSING: UsedPrice = { status: "missing", origin: "api" };

function atLevel(recipe: GameRecipe, level: number): GameRecipe | undefined {
  return RECIPES_BY_ID.get(
    level === 0 ? recipe.baseId : `${recipe.baseId}@${String(level)}`,
  );
}

function upgradable(recipe: GameRecipe): boolean {
  return recipe.enchant > 0 && recipe.upgrade !== undefined;
}

// The lower levels of every upgradable recipe that aren't themselves among
// `recipes`, to price the path that crafts lower and upgrades.
export function lowerEnchants(recipes: readonly GameRecipe[]): GameRecipe[] {
  const have = new Set(recipes.map(({ itemId }) => itemId));
  const lower = new Map<string, GameRecipe>();
  for (const recipe of recipes.filter(upgradable)) {
    for (let level = 0; level < recipe.enchant; level += 1) {
      const sibling = atLevel(recipe, level);
      if (sibling !== undefined && !have.has(sibling.itemId)) {
        lower.set(sibling.itemId, sibling);
      }
    }
  }
  return [...lower.values()];
}

// The runes, souls and relics the upgradable recipes' paths can take.
export function upgradeMaterials(recipes: readonly GameRecipe[]): string[] {
  const ids = new Set<string>();
  for (const recipe of recipes.filter(upgradable)) {
    for (let level = 1; level <= recipe.enchant; level += 1) {
      const upgrade = atLevel(recipe, level)?.upgrade;
      if (upgrade !== undefined) {
        ids.add(upgrade.id);
      }
    }
  }
  return [...ids];
}

// Silver per item, without the sale: the materials, station fee and silver.
function craftCost(craft: Craft): number | undefined {
  const { materialCost: cost, stationFee, silverCost, recipe } = craft;
  if (cost.status === "incomplete" || stationFee === undefined) {
    return undefined;
  }
  const alternative =
    craft.alternative === 0
      ? recipe
      : recipe.alternatives[craft.alternative - 1];
  return (
    (cost.total + stationFee + silverCost) / (alternative?.amountCrafted ?? 1)
  );
}

// Upgrading earns no crafting fame and takes no focus, so the upgraded path's
// journal value, focus cost and silver per focus are those of the craft it
// starts from.
function rankedBy(
  craft: Craft,
  paths: EnchantPaths,
  start: Craft | undefined,
): Craft {
  const { direct, upgraded } = paths;
  if (
    craft.status !== "complete" ||
    paths.cheaper !== "upgraded" ||
    direct === undefined ||
    upgraded === undefined
  ) {
    return { ...craft, enchantPaths: paths };
  }
  const saved = direct - upgraded.total;
  const profit =
    craft.profit +
    saved -
    (craft.journal?.value ?? 0) +
    (start?.journal?.value ?? 0);
  const ranked: Craft = { ...craft };
  delete ranked.focusCost;
  delete ranked.silverPerFocus;
  return {
    ...ranked,
    ...(start?.focusCost !== undefined && { focusCost: start.focusCost }),
    ...(start?.status === "complete" &&
      start.silverPerFocus !== undefined && {
        silverPerFocus: start.silverPerFocus,
      }),
    enchantPaths: paths,
    profit,
    margin: upgraded.total > 0 ? profit / upgraded.total : undefined,
  };
}

// A recipe chosen at one enchantment level is used at the lower levels it can
// be upgraded from too, unless they have their own choice.
export function lowerChoices(
  recipes: readonly GameRecipe[],
  choices: RecipeChoices,
): RecipeChoices {
  const lower: Record<string, number> = {};
  for (const recipe of recipes) {
    const choice = choices[recipe.itemId];
    if (choice === undefined) {
      continue;
    }
    for (let level = 0; level < recipe.enchant; level += 1) {
      const sibling = atLevel(recipe, level);
      if (sibling !== undefined) {
        lower[sibling.itemId] ??= choice;
      }
    }
  }
  return { ...lower, ...choices };
}

// Gives each upgradable craft both paths. With `rank`, a craft that's cheaper
// upgraded ranks by that path's profit.
export function withEnchantPaths(
  crafts: readonly Craft[],
  lowerCrafts: readonly Craft[],
  materials: readonly UsedItemPrices[],
  { buyMode, rank }: { buyMode: BuyMode; rank: boolean },
): Craft[] {
  const byId = new Map(
    [...crafts, ...lowerCrafts].map((craft) => [craft.itemId, craft]),
  );
  const prices = new Map(materials.map((price) => [price.itemId, price]));
  return crafts.map((craft) => {
    if (!upgradable(craft.recipe)) {
      return craft;
    }
    const startOf = ({ upgraded }: EnchantPaths) => {
      const start =
        upgraded === undefined
          ? undefined
          : atLevel(craft.recipe, upgraded.from);
      return start && byId.get(start.itemId);
    };
    const paths = enchantPaths(craft.recipe.enchant, {
      craft: (level) => {
        const sibling = atLevel(craft.recipe, level);
        const found = sibling && byId.get(sibling.itemId);
        return found && craftCost(found);
      },
      upgrade: (level) => {
        const upgrade = atLevel(craft.recipe, level)?.upgrade;
        if (upgrade === undefined) {
          return undefined;
        }
        const cost = materialCost(
          [{ id: upgrade.id, count: upgrade.count, returnable: false }],
          prices,
          { returnRate: 0, buyMode },
        );
        return {
          materialId: upgrade.id,
          count: upgrade.count,
          cost: cost.status === "complete" ? cost.total : undefined,
        };
      },
    });
    const source = buyMode === "instant" ? "sellMin" : "buyMax";
    const upgrades: UpgradeMaterial[] = [];
    for (let level = 1; level <= craft.recipe.enchant; level += 1) {
      const upgrade = atLevel(craft.recipe, level)?.upgrade;
      if (upgrade !== undefined) {
        upgrades.push({
          itemId: upgrade.id,
          count: upgrade.count,
          source,
          price: prices.get(upgrade.id)?.[source] ?? MISSING,
        });
      }
    }
    const withPaths = { ...craft, upgradeMaterials: upgrades };
    return rank
      ? rankedBy(withPaths, paths, startOf(paths))
      : { ...withPaths, enchantPaths: paths };
  });
}
