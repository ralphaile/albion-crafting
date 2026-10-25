import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { extractRecipes } from "./recipes.ts";
import { type Dumps, validate } from "./validate.ts";
import type { Recipe } from "../src/recipe.ts";

type Items = Dumps["items.json"]["items"];
type GearItem = Items["weapon"][number];

const fixtures = fileURLToPath(
  new URL("../test/fixtures/dumps", import.meta.url),
);

async function fixtureRecipes(): Promise<Recipe[]> {
  return extractRecipes((await validate(fixtures))["items.json"].items);
}

function find(recipes: Recipe[], itemId: string): Recipe | undefined {
  return recipes.find((recipe) => recipe.itemId === itemId);
}

function only(item: GearItem): Items {
  return {
    weapon: [],
    transformationweapon: [],
    equipmentitem: [item],
    simpleitem: [],
  };
}

describe("extractRecipes", () => {
  it("makes one recipe per item and enchantment level, sorted by item ID", async () => {
    const recipes = await fixtureRecipes();

    expect(recipes.map((recipe) => recipe.itemId)).toEqual([
      "T4_2H_BOW",
      "T4_2H_BOW@1",
      "T4_2H_BOW@2",
      "T4_2H_SHAPESHIFTER_SET1",
      "T4_2H_SHAPESHIFTER_SET1@1",
      "T4_2H_SHAPESHIFTER_SET1@2",
      "T4_HEAD_CLOTH_ROYAL",
      "T4_HEAD_CLOTH_ROYAL@1",
      "T4_HEAD_PLATE_SET1",
      "T4_HEAD_PLATE_SET1@1",
      "T4_HEAD_PLATE_SET1@2",
      "T4_MAIN_SWORD",
      "T4_MAIN_SWORD@1",
      "T4_MAIN_SWORD@2",
      "T6_MAIN_SCIMITAR_MORGANA",
      "T6_MAIN_SCIMITAR_MORGANA@1",
      "T6_MAIN_SCIMITAR_MORGANA@2",
    ]);
  });

  it("gives an enchanted item its own market ID, materials and focus", async () => {
    const recipes = await fixtureRecipes();

    expect(find(recipes, "T4_MAIN_SWORD@1")).toEqual({
      itemId: "T4_MAIN_SWORD@1",
      baseId: "T4_MAIN_SWORD",
      tier: 4,
      enchant: 1,
      craftingCategory: "sword",
      shopCategory: "weapons",
      shopSubcategory: "sword",
      isArtifact: false,
      focus: 2251,
      silver: 0,
      amountCrafted: 1,
      resources: [
        { id: "T4_METALBAR_LEVEL1@1", count: 16, returnable: true },
        { id: "T4_LEATHER_LEVEL1@1", count: 8, returnable: true },
      ],
      alternatives: [],
    });
  });

  it("keeps the artifact recipe as the default and the token recipe as an alternative", async () => {
    const recipes = await fixtureRecipes();

    expect(find(recipes, "T6_MAIN_SCIMITAR_MORGANA")).toEqual({
      itemId: "T6_MAIN_SCIMITAR_MORGANA",
      baseId: "T6_MAIN_SCIMITAR_MORGANA",
      tier: 6,
      enchant: 0,
      craftingCategory: "sword",
      shopCategory: "weapons",
      shopSubcategory: "sword",
      isArtifact: true,
      focus: 3939,
      silver: 0,
      amountCrafted: 1,
      resources: [
        { id: "T6_METALBAR", count: 16, returnable: true },
        { id: "T6_LEATHER", count: 8, returnable: true },
        {
          id: "T6_ARTEFACT_MAIN_SCIMITAR_MORGANA",
          count: 1,
          returnable: false,
        },
      ],
      alternatives: [
        {
          focus: 3939,
          silver: 0,
          amountCrafted: 1,
          resources: [
            { id: "T6_METALBAR", count: 16, returnable: true },
            { id: "T6_LEATHER", count: 8, returnable: true },
            { id: "T6_ARTEFACT_TOKEN_FAVOR_1", count: 1, returnable: false },
          ],
        },
      ],
    });
  });

  it("marks an ingredient that's never returned without calling the item an artifact", async () => {
    const staff = find(await fixtureRecipes(), "T4_2H_SHAPESHIFTER_SET1");

    expect(staff?.isArtifact).toBe(false);
    expect(staff?.resources).toContainEqual({
      id: "T3_ALCHEMY_RARE_PANTHER",
      count: 2,
      returnable: false,
    });
  });

  it("keeps the three recipes of a royal item, which has no crafting category", async () => {
    const royal = find(await fixtureRecipes(), "T4_HEAD_CLOTH_ROYAL@1");

    expect(royal).not.toHaveProperty("craftingCategory");
    expect(royal?.resources).toEqual([
      { id: "T4_HEAD_CLOTH_SET1@1", count: 1, returnable: false },
      { id: "QUESTITEM_TOKEN_ROYAL_T4", count: 2, returnable: false },
    ]);
    expect(
      royal?.alternatives.map((alternative) => alternative.resources[0]?.id),
    ).toEqual(["T4_HEAD_CLOTH_SET2@1", "T4_HEAD_CLOTH_SET3@1"]);
  });

  it.each<[string, (item: GearItem) => GearItem]>([
    ["a T3 item", (item) => ({ ...item, "@tier": 3 })],
    ["a cape", (item) => ({ ...item, "@shopcategory": "capes" })],
    [
      "an item the market doesn't show",
      (item) => ({ ...item, "@showinmarketplace": false }),
    ],
    [
      "an unreleased prototype",
      (item) => ({ ...item, "@uniquename": "T8_ARMOR_PLATE_PROTOTYPE" }),
    ],
    [
      "an item with no recipe",
      (item) => ({
        "@uniquename": item["@uniquename"],
        "@tier": item["@tier"],
        "@shopcategory": item["@shopcategory"],
        "@shopsubcategory1": item["@shopsubcategory1"],
      }),
    ],
  ])("leaves out %s", async (_, change) => {
    const { equipmentitem } = (await validate(fixtures))["items.json"].items;
    const helmet = equipmentitem[0]!;

    expect(extractRecipes(only(helmet))).not.toEqual([]);
    expect(extractRecipes(only(change(helmet)))).toEqual([]);
  });
});
