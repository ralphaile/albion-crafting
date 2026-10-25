import { describe, expect, it } from "vitest";

import {
  type CraftingLocation,
  craftingLocations,
  hideouts,
  iconUrl,
  itemName,
  type Recipe,
  recipes,
  searchItems,
} from "./index.js";

describe("recipes", () => {
  it.each<[string, Recipe]>([
    [
      "Expert's Broadsword",
      {
        itemId: "T5_MAIN_SWORD",
        baseId: "T5_MAIN_SWORD",
        tier: 5,
        enchant: 0,
        craftingCategory: "sword",
        shopCategory: "weapons",
        shopSubcategory: "sword",
        isArtifact: false,
        focus: 2251,
        silver: 0,
        amountCrafted: 1,
        resources: [
          { id: "T5_METALBAR", count: 16, returnable: true },
          { id: "T5_LEATHER", count: 8, returnable: true },
        ],
        alternatives: [],
        itemValue: 768,
      },
    ],
    [
      "Expert's Broadsword .1",
      {
        itemId: "T5_MAIN_SWORD@1",
        baseId: "T5_MAIN_SWORD",
        tier: 5,
        enchant: 1,
        craftingCategory: "sword",
        shopCategory: "weapons",
        shopSubcategory: "sword",
        isArtifact: false,
        focus: 3939,
        silver: 0,
        amountCrafted: 1,
        resources: [
          { id: "T5_METALBAR_LEVEL1@1", count: 16, returnable: true },
          { id: "T5_LEATHER_LEVEL1@1", count: 8, returnable: true },
        ],
        alternatives: [],
        itemValue: 1536,
      },
    ],
    [
      "Master's Clarent Blade, an artifact weapon",
      {
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
        itemValue: 1920,
      },
    ],
  ])("has the known recipe for the %s", (_, expected) => {
    expect(recipes.find((recipe) => recipe.itemId === expected.itemId)).toEqual(
      expected,
    );
  });

  it("values the Adept's Royal Jacket at 320, as the game does", () => {
    expect(
      recipes.find((recipe) => recipe.itemId === "T4_ARMOR_LEATHER_ROYAL")
        ?.itemValue,
    ).toBe(320);
  });
});

describe("itemName", () => {
  it.each([
    ["T5_MAIN_SWORD", "Expert's Broadsword 5.0"],
    ["T5_MAIN_SWORD@1", "Expert's Broadsword 5.1"],
    ["T5_METALBAR_LEVEL1@1", "Uncommon Titanium Steel Bar 5.1"],
  ])("names %s %s", (id, name) => {
    expect(itemName(id)).toBe(name);
  });

  it("falls back to the ID for an item it doesn't know", () => {
    expect(itemName("T4_NOT_AN_ITEM")).toBe("T4_NOT_AN_ITEM");
  });
});

describe("iconUrl", () => {
  it("points at the item's 64-pixel icon on the Albion render service", () => {
    expect(iconUrl("T5_MAIN_SWORD@1")).toBe(
      "https://render.albiononline.com/v1/item/T5_MAIN_SWORD@1.png?quality=1&size=64",
    );
  });
});

describe("searchItems", () => {
  it("finds every enchantment level of the Expert's Broadsword", () => {
    expect(searchItems("expert broadsword")).toEqual([
      "T5_MAIN_SWORD",
      "T5_MAIN_SWORD@1",
      "T5_MAIN_SWORD@2",
      "T5_MAIN_SWORD@3",
      "T5_MAIN_SWORD@4",
    ]);
  });

  it("narrows down to one item with its tier.enchant", () => {
    expect(searchItems("Broadsword 5.1")).toEqual(["T5_MAIN_SWORD@1"]);
  });

  it("leaves out the materials", () => {
    expect(searchItems("titanium steel bar")).toEqual([]);
  });
});

describe("craftingLocations", () => {
  it.each<[string, CraftingLocation]>([
    [
      "Lymhurst",
      {
        id: "1000",
        name: "Lymhurst",
        craftingBonus: 0.18,
        specialties: {
          meat_goose: 0.1,
          sword: 0.15,
          bow: 0.15,
          arcanestaff: 0.15,
          leather_helmet: 0.15,
          leather_shoes: 0.15,
        },
      },
    ],
    [
      "Arthur's Rest",
      {
        id: "4300",
        name: "Arthur's Rest",
        craftingBonus: 0.18,
        specialties: {
          axe: 0.15,
          crossbow: 0.15,
          hammer: 0.15,
          mace: 0.15,
          sword: 0.15,
          knuckles: 0.15,
          plate_helmet: 0.15,
          plate_armor: 0.15,
          plate_shoes: 0.15,
        },
      },
    ],
    [
      "Island",
      { id: "island", name: "Island", craftingBonus: 0, specialties: {} },
    ],
  ])("has the known bonuses for %s", (name, expected) => {
    expect(
      craftingLocations.find((location) => location.name === name),
    ).toEqual(expected);
  });

  it("has a specialty for every recipe's crafting category", () => {
    const specialties = new Set(
      craftingLocations.flatMap((location) =>
        Object.keys(location.specialties),
      ),
    );
    const categories = new Set(
      recipes.flatMap(({ craftingCategory }) =>
        craftingCategory === undefined ? [] : [craftingCategory],
      ),
    );

    expect(
      [...categories].filter((category) => !specialties.has(category)),
    ).toEqual([]);
  });
});

describe("hideouts", () => {
  it("has the bonus each map quality gives a biome's specialties", () => {
    expect(hideouts.mapQualities).toEqual([
      { quality: 1, specialtyBonus: 0.01 },
      { quality: 2, specialtyBonus: 0.06 },
      { quality: 3, specialtyBonus: 0.11 },
      { quality: 4, specialtyBonus: 0.16 },
      { quality: 5, specialtyBonus: 0.21 },
      { quality: 6, specialtyBonus: 0.26 },
    ]);
  });

  it("has the general and specialist bonuses at each power level", () => {
    expect(hideouts.powerLevels).toEqual([
      { level: 1, generalBonus: 0, specialistBonus: 0 },
      { level: 2, generalBonus: 0.06, specialistBonus: 0.0375 },
      { level: 3, generalBonus: 0.11, specialistBonus: 0.075 },
      { level: 4, generalBonus: 0.15, specialistBonus: 0.1125 },
      { level: 5, generalBonus: 0.18, specialistBonus: 0.15 },
      { level: 6, generalBonus: 0.2, specialistBonus: 0.1875 },
      { level: 7, generalBonus: 0.22, specialistBonus: 0.225 },
      { level: 8, generalBonus: 0.24, specialistBonus: 0.2625 },
      { level: 9, generalBonus: 0.26, specialistBonus: 0.3 },
    ]);
  });

  it("names each biome's royal city and specialties", () => {
    expect(
      hideouts.biomes.map(({ name, cityId, specialties }) => [
        name,
        craftingLocations.find(({ id }) => id === cityId)?.name,
        specialties,
      ]),
    ).toEqual([
      [
        "Swamp",
        "Thetford",
        ["mace", "naturestaff", "firestaff", "leather_armor", "cloth_helmet"],
      ],
      [
        "Forest",
        "Lymhurst",
        ["sword", "bow", "arcanestaff", "leather_helmet", "leather_shoes"],
      ],
      [
        "Steppe",
        "Bridgewatch",
        ["crossbow", "dagger", "cursestaff", "plate_armor", "cloth_shoes"],
      ],
      [
        "Highland",
        "Martlock",
        ["axe", "quarterstaff", "froststaff", "plate_shoes", "offhand"],
      ],
      [
        "Mountain",
        "Fort Sterling",
        ["hammer", "spear", "holystaff", "plate_helmet", "cloth_armor"],
      ],
    ]);
  });

  it.each(hideouts.biomes)(
    "gives $name its royal city's gear specialties",
    ({ cityId, specialties }) => {
      const city = craftingLocations.find(({ id }) => id === cityId);

      expect(
        Object.keys(city?.specialties ?? {}).filter(
          (category) => !category.startsWith("meat_"),
        ),
      ).toEqual(specialties);
    },
  );

  it("gives hideouts a refining bonus of 15%", () => {
    expect(hideouts.refiningBonus).toBe(0.15);
  });
});
