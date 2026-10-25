import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { addItemValues } from "./item-value.ts";
import { extractRecipes } from "./recipes.ts";
import { validate } from "./validate.ts";
import type { Recipe, Resource } from "../src/recipe.ts";

const fixtures = fileURLToPath(
  new URL("../test/fixtures/dumps", import.meta.url),
);

async function fixtureItemValues() {
  const { items } = (await validate(fixtures))["items.json"];
  return addItemValues(extractRecipes(items), items.simpleitem);
}

function valueOf(recipes: Recipe[], itemId: string): number | undefined {
  return recipes.find((recipe) => recipe.itemId === itemId)?.itemValue;
}

function recipe(
  itemId: string,
  resources: Omit<Resource, "returnable">[],
  amountCrafted = 1,
): Recipe {
  return {
    itemId,
    baseId: itemId,
    tier: 4,
    enchant: 0,
    shopCategory: "head",
    shopSubcategory: "cloth_helmet",
    isArtifact: false,
    focus: 0,
    silver: 0,
    amountCrafted,
    resources: resources.map((resource) => ({
      ...resource,
      returnable: true,
    })),
    alternatives: [],
  };
}

const simpleItems = [
  { "@uniquename": "T4_CLOTH", "@tier": 4, "@itemvalue": 16 },
  { "@uniquename": "QUESTITEM_TOKEN_ROYAL_T4", "@tier": 4, "@itemvalue": 16 },
];

describe("addItemValues", () => {
  it("values Adept's Broadsword at 16 × 16 + 8 × 16", async () => {
    const { recipes } = await fixtureItemValues();

    expect(valueOf(recipes, "T4_MAIN_SWORD")).toBe(384);
  });

  it("doubles the value with each enchantment level of the materials", async () => {
    const { recipes } = await fixtureItemValues();

    expect(valueOf(recipes, "T4_MAIN_SWORD@1")).toBe(768);
    expect(valueOf(recipes, "T4_MAIN_SWORD@2")).toBe(1536);
  });

  it("counts the artifact's item value", async () => {
    const { recipes } = await fixtureItemValues();

    expect(valueOf(recipes, "T6_MAIN_SCIMITAR_MORGANA")).toBe(
      16 * 64 + 8 * 64 + 384,
    );
  });

  it("warns about a material with no @itemvalue and gives its items no value", async () => {
    const { recipes, warnings } = await fixtureItemValues();

    expect(
      recipes.find((r) => r.itemId === "T4_2H_SHAPESHIFTER_SET1"),
    ).not.toHaveProperty("itemValue");
    expect(warnings).toContain(
      "No @itemvalue for T3_ALCHEMY_RARE_PANTHER, so these have no item value: T4_2H_SHAPESHIFTER_SET1, T4_2H_SHAPESHIFTER_SET1@1, T4_2H_SHAPESHIFTER_SET1@2",
    );
  });

  it("divides by the amount crafted", () => {
    const { recipes } = addItemValues(
      [recipe("T4_HEAD_CLOTH_SET1", [{ id: "T4_CLOTH", count: 6 }], 2)],
      simpleItems,
    );

    expect(recipes[0]?.itemValue).toBe(48);
  });

  it("values a gear material, such as a royal item's base piece, from its own recipe", () => {
    const { recipes, warnings } = addItemValues(
      [
        recipe("T4_HEAD_CLOTH_ROYAL", [
          { id: "T4_HEAD_CLOTH_SET1", count: 1 },
          { id: "QUESTITEM_TOKEN_ROYAL_T4", count: 2 },
        ]),
        recipe("T4_HEAD_CLOTH_SET1", [{ id: "T4_CLOTH", count: 8 }]),
      ],
      simpleItems,
    );

    expect(recipes[0]?.itemValue).toBe(8 * 16 + 2 * 16);
    expect(warnings).toEqual([]);
  });

  it("warns only once about a material, not about the items made from its items", () => {
    const { recipes, warnings } = addItemValues(
      [
        recipe("T4_HEAD_CLOTH_ROYAL", [{ id: "T4_HEAD_CLOTH_SET1", count: 1 }]),
        recipe("T4_HEAD_CLOTH_SET1", [{ id: "T4_UNKNOWN", count: 8 }]),
      ],
      simpleItems,
    );

    expect(recipes.map((r) => r.itemValue)).toEqual([undefined, undefined]);
    expect(warnings).toEqual([
      "No @itemvalue for T4_UNKNOWN, so these have no item value: T4_HEAD_CLOTH_SET1",
    ]);
  });
});
