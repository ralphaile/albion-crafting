import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { extractItems } from "./items.ts";
import { extractRecipes } from "./recipes.ts";
import { validate } from "./validate.ts";

const fixtures = fileURLToPath(
  new URL("../test/fixtures/dumps", import.meta.url),
);

async function fixtureItems() {
  const dumps = await validate(fixtures);
  return extractItems(
    extractRecipes(dumps["items.json"].items),
    dumps["formatted/items.json"],
  );
}

describe("extractItems", () => {
  it.each([
    [
      "an item, with .0 when it isn't enchanted",
      "T4_MAIN_SWORD",
      "Adept's Broadsword 4.0",
    ],
    ["an enchanted item", "T4_MAIN_SWORD@1", "Adept's Broadsword 4.1"],
    ["a material", "T4_METALBAR_LEVEL1@1", "Uncommon Steel Bar 4.1"],
    [
      "an item whose ID has no tier, without one",
      "QUESTITEM_TOKEN_ROYAL_T4",
      "Adept's Royal Sigil",
    ],
  ])("names %s in English", async (_, id, name) => {
    const { items } = await fixtureItems();

    expect(items.find((item) => item.id === id)?.name).toBe(name);
  });

  it("sorts the items by ID", async () => {
    const { items } = await fixtureItems();

    expect(items.map(({ id }) => id)).toEqual([
      "QUESTITEM_TOKEN_ROYAL_T4",
      "T4_2H_BOW",
      "T4_HEAD_PLATE_SET1",
      "T4_MAIN_SWORD",
      "T4_MAIN_SWORD@1",
      "T4_METALBAR_LEVEL1@1",
    ]);
  });

  it("marks the crafted items, not the materials", async () => {
    const { items } = await fixtureItems();

    expect(items.filter(({ crafted }) => crafted).map(({ id }) => id)).toEqual([
      "T4_2H_BOW",
      "T4_HEAD_PLATE_SET1",
      "T4_MAIN_SWORD",
      "T4_MAIN_SWORD@1",
    ]);
    expect(items.find(({ id }) => id === "T4_METALBAR_LEVEL1@1")).toEqual({
      id: "T4_METALBAR_LEVEL1@1",
      name: "Uncommon Steel Bar 4.1",
    });
  });

  it("warns once about the items with no English name, and leaves them out", async () => {
    const { items, warnings } = await fixtureItems();

    expect(items.map(({ id }) => id)).not.toContain("T4_MAIN_SWORD@2");
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(
      /^No EN-US name for 36 item IDs, so the app shows the IDs: T3_ALCHEMY_RARE_PANTHER, .*T4_MAIN_SWORD@2, /,
    );
  });

  it("doesn't warn when every item has a name", () => {
    const { warnings } = extractItems(
      [],
      [{ UniqueName: "T4_MAIN_SWORD", LocalizedNames: { "EN-US": "x" } }],
    );

    expect(warnings).toEqual([]);
  });
});
