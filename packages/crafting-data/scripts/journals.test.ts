import { describe, expect, it } from "vitest";

import type { Dumps } from "./dumps.schema.ts";
import { addJournals } from "./journals.helpers.ts";
import type { GameRecipe } from "../src/recipe.types.ts";

type Items = Dumps["items.json"]["items"];

const warriorJournal: Items["journalitem"][number] = {
  "@uniquename": "T5_JOURNAL_WARRIOR",
  "@tier": 5,
  "@maxfame": 7200,
  famefillingmissions: {
    craftitemfame: {
      validitem: [
        { "@id": "T5_MAIN_SWORD" },
        { "@id": "T5_MAIN_SCIMITAR_MORGANA" },
      ],
    },
  },
};

function gear(uniqueName: string, journalFactor?: number) {
  return {
    "@uniquename": uniqueName,
    "@tier": 5,
    "@shopcategory": "weapons",
    "@shopsubcategory1": "sword",
    ...(journalFactor === undefined
      ? {}
      : { "@destinyandjournalcraftfamefactor": journalFactor }),
  };
}

const items: Items = {
  weapon: [gear("T5_MAIN_SWORD"), gear("T5_MAIN_SCIMITAR_MORGANA", 1.1)],
  equipmentitem: [],
  transformationweapon: [],
  simpleitem: [],
  consumableitem: [],
  journalitem: [
    warriorJournal,
    // A gatherer's journal fills from gathering, not crafting.
    {
      "@uniquename": "T5_JOURNAL_ORE",
      "@tier": 5,
      "@maxfame": 7200,
      famefillingmissions: {},
    },
  ],
};

function recipe(changes: Partial<GameRecipe>): GameRecipe {
  return {
    itemId: "T5_MAIN_SWORD",
    baseId: "T5_MAIN_SWORD",
    tier: 5,
    enchant: 0,
    shopCategory: "weapons",
    shopSubcategory: "sword",
    isArtifact: false,
    focus: 2251,
    silver: 0,
    amountCrafted: 1,
    materials: [
      { id: "T5_METALBAR", count: 16, returnable: true },
      { id: "T5_LEATHER", count: 8, returnable: true },
    ],
    alternatives: [],
    ...changes,
  };
}

describe("addJournals", () => {
  it("gives a T5 broadsword the T5 Blacksmith's journal and 90 fame for each of its 24 materials", () => {
    expect(addJournals([recipe({})], items)[0]?.journal).toEqual({
      id: "T5_JOURNAL_WARRIOR",
      capacity: 7200,
      fame: 2160,
    });
  });

  it("doubles the fame for each enchantment level", () => {
    expect(
      addJournals([recipe({ itemId: "T5_MAIN_SWORD@2", enchant: 2 })], items)[0]
        ?.journal?.fame,
    ).toBe(8640);
  });

  it("leaves the artifact out of the materials, and raises the fame by the item's factor", () => {
    const [scimitar] = addJournals(
      [
        recipe({
          itemId: "T5_MAIN_SCIMITAR_MORGANA",
          baseId: "T5_MAIN_SCIMITAR_MORGANA",
          isArtifact: true,
          materials: [
            { id: "T5_METALBAR", count: 16, returnable: true },
            { id: "T5_LEATHER", count: 8, returnable: true },
            {
              id: "T5_ARTEFACT_MAIN_SCIMITAR_MORGANA",
              count: 1,
              returnable: false,
            },
          ],
        }),
      ],
      items,
    );

    expect(scimitar?.journal?.fame).toBeCloseTo(2376);
  });

  it("gives no journal to an item no journal takes, or one made only from what doesn't come back", () => {
    const recipes = addJournals(
      [
        recipe({ itemId: "T5_2H_AXE", baseId: "T5_2H_AXE" }),
        recipe({
          materials: [
            { id: "QUESTITEM_TOKEN_ROYAL_T5", count: 4, returnable: false },
          ],
        }),
      ],
      items,
    );

    expect(recipes.map((each) => each.journal)).toEqual([undefined, undefined]);
  });
});
