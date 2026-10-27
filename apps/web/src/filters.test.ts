import { describe, expect, it } from "vitest";

import type { CraftingPlace } from "@aoc/core";
import { type GameRecipe, recipes } from "@aoc/crafting-data";

import type { Craft } from "./best-crafts.types";
import { CATEGORIES, NO_FILTERS } from "./filters.constants";
import { activeFilters, craftFilter, recipeFilter } from "./filters.helpers";
import type { Filters } from "./filters.types";

function recipe(
  itemId: string,
  facts: Partial<GameRecipe> & Pick<GameRecipe, "shopCategory">,
): GameRecipe {
  return {
    itemId,
    baseId: itemId,
    tier: 4,
    enchant: 0,
    shopSubcategory: "",
    isArtifact: false,
    focus: 0,
    silver: 0,
    amountCrafted: 1,
    materials: [],
    alternatives: [],
    ...facts,
  };
}

const broadsword = recipe("T4_MAIN_SWORD", {
  shopCategory: "weapons",
  shopSubcategory: "sword",
  craftingCategory: "sword",
});
const clarentBlade = recipe("T6_MAIN_SCIMITAR_MORGANA@2", {
  tier: 6,
  enchant: 2,
  shopCategory: "weapons",
  shopSubcategory: "sword",
  craftingCategory: "sword",
  isArtifact: true,
});
const bow = recipe("T5_2H_BOW@1", {
  tier: 5,
  enchant: 1,
  shopCategory: "weapons",
  shopSubcategory: "bow",
  craftingCategory: "bow",
});
const plateHelmet = recipe("T6_HEAD_PLATE_SET1", {
  tier: 6,
  shopCategory: "head",
  shopSubcategory: "plate_helmet",
  craftingCategory: "plate_helmet",
});
const plateArmor = recipe("T6_ARMOR_PLATE_SET1", {
  tier: 6,
  shopCategory: "armors",
  shopSubcategory: "plate_armor",
  craftingCategory: "plate_armor",
});
const clothHood = recipe("T6_HEAD_CLOTH_SET1", {
  tier: 6,
  shopCategory: "head",
  shopSubcategory: "cloth_helmet",
  craftingCategory: "cloth_helmet",
});
const leatherShoes = recipe("T6_SHOES_LEATHER_SET1", {
  tier: 6,
  shopCategory: "shoes",
  shopSubcategory: "leather_shoes",
  craftingCategory: "leather_shoes",
});
const shield = recipe("T4_OFF_SHIELD", {
  shopCategory: "offhands",
  shopSubcategory: "shieldtype",
  craftingCategory: "offhand",
});
const examples = [
  broadsword,
  clarentBlade,
  bow,
  plateHelmet,
  plateArmor,
  clothHood,
  leatherShoes,
  shield,
];

const lymhurst: CraftingPlace = {
  location: {
    id: "1000",
    name: "Lymhurst",
    craftingBonus: 0.18,
    specialties: { sword: 0.15, cloth_helmet: 0.15 },
  },
};

function passing(
  filters: Partial<Filters>,
  from: readonly GameRecipe[] = examples,
) {
  return from
    .filter(recipeFilter({ ...NO_FILTERS, ...filters }, lymhurst))
    .map(({ itemId }) => itemId);
}

describe("recipeFilter", () => {
  it("lets every recipe through with no filters", () => {
    expect(passing({}, recipes)).toHaveLength(recipes.length);
  });

  it.each<[string, Partial<Filters>, GameRecipe[]]>([
    [
      "the tiers chosen",
      { tiers: [5, 6] },
      [clarentBlade, bow, plateHelmet, plateArmor, clothHood, leatherShoes],
    ],
    ["the enchantments chosen", { enchants: [1, 2] }, [clarentBlade, bow]],
    ["a weapon type", { categories: ["bow"] }, [bow]],
    ["an armor piece", { categories: ["plate_helmet"] }, [plateHelmet]],
    [
      "armor pieces of different materials and slots",
      { categories: ["plate_helmet", "leather_shoes"] },
      [plateHelmet, leatherShoes],
    ],
    ["an offhand type", { categories: ["shieldtype"] }, [shield]],
    [
      "whatever any chosen category allows",
      { categories: ["sword", "cloth_helmet", "shieldtype"] },
      [broadsword, clarentBlade, clothHood, shield],
    ],
    [
      "no artifacts",
      { artifacts: "exclude" },
      examples.filter((item) => item !== clarentBlade),
    ],
    ["only artifacts", { artifacts: "only" }, [clarentBlade]],
    [
      "the location's specialties",
      { specialtyOnly: true },
      [broadsword, clarentBlade, clothHood],
    ],
  ])("keeps %s", (_case, filters, expected) => {
    expect(passing(filters)).toEqual(expected.map(({ itemId }) => itemId));
  });

  it("finds items by name, in any case and without apostrophes", () => {
    expect(passing({ search: "  adepts BROADSWORD 4.0 " }, recipes)).toEqual([
      "T4_MAIN_SWORD",
    ]);
  });

  it("finds items by their ID", () => {
    expect(passing({ search: "t4_main_sword@1" }, recipes)).toEqual([
      "T4_MAIN_SWORD@1",
    ]);
  });

  it("finds every recipe of each category in the game data", () => {
    const categories = new Set(recipes.map((recipe) => recipe.shopSubcategory));

    expect([...categories].sort()).toEqual(
      CATEGORIES.map(({ id }) => id).sort(),
    );
  });

  it("widens the list with another category", () => {
    const swords = passing({ categories: ["sword"] }, recipes);
    const swordsAndBows = passing({ categories: ["bow", "sword"] }, recipes);

    expect(swordsAndBows.length).toBeGreaterThan(swords.length);
    expect(swordsAndBows).toEqual(expect.arrayContaining(swords));
  });

  it("needs a recipe to pass every filter", () => {
    expect(
      passing(
        {
          tiers: [6],
          enchants: [2],
          categories: ["sword"],
          artifacts: "only",
          specialtyOnly: true,
          search: "clarent",
        },
        recipes,
      ),
    ).toEqual(["T6_MAIN_SCIMITAR_MORGANA@2"]);
  });

  it.each<[string, Partial<Filters>]>([
    ["a tier", { tiers: [7] }],
    ["an enchantment", { enchants: [3] }],
    ["a category", { categories: ["leather_shoes"] }],
    ["no artifacts", { artifacts: "exclude" }],
    ["specialty only", { specialtyOnly: true }],
    ["a name", { search: "staff" }],
  ])("never keeps more recipes after adding %s", (_case, added) => {
    const base: Partial<Filters> = { tiers: [6, 7] };
    const before = new Set(passing(base, recipes));
    const after = passing({ ...base, ...added }, recipes);

    expect(after.length).toBeLessThan(before.size);
    expect(after.every((itemId) => before.has(itemId))).toBe(true);
  });
});

function complete(profit: number, margin: number | undefined): Craft {
  return { status: "complete", profit, margin } as Craft;
}
const incomplete = { status: "incomplete" } as Craft;

describe("craftFilter", () => {
  it.each<[string, Partial<Filters>, Craft, boolean]>([
    ["keeps any craft with no filters", {}, complete(-50, -0.1), true],
    [
      "keeps a craft at the minimum profit",
      { minProfit: 1000 },
      complete(1000, 0.2),
      true,
    ],
    [
      "drops a craft below the minimum profit",
      { minProfit: 1000 },
      complete(999, 0.9),
      false,
    ],
    [
      "keeps a craft at the minimum margin",
      { minMarginPercent: 15 },
      complete(10, 0.15),
      true,
    ],
    [
      "drops a craft below the minimum margin",
      { minMarginPercent: 15 },
      complete(5000, 0.149),
      false,
    ],
    [
      "keeps a craft that cost nothing, whatever the margin",
      { minMarginPercent: 50 },
      complete(10, undefined),
      true,
    ],
    [
      "keeps a craft with missing prices whatever the minimums",
      { minProfit: 1000, minMarginPercent: 15 },
      incomplete,
      true,
    ],
    [
      "drops a craft with missing prices when asked",
      { hideIncomplete: true },
      incomplete,
      false,
    ],
    [
      "keeps a complete craft when crafts with missing prices are hidden",
      { hideIncomplete: true },
      complete(1, 0.01),
      true,
    ],
    [
      "needs both minimums",
      { minProfit: 1000, minMarginPercent: 15 },
      complete(2000, 0.1),
      false,
    ],
  ])("%s", (_case, filters, craft, expected) => {
    expect(craftFilter({ ...NO_FILTERS, ...filters })(craft)).toBe(expected);
  });
});

describe("activeFilters", () => {
  const filters: Filters = {
    ...NO_FILTERS,
    tiers: [6, 7],
    enchants: [1],
    categories: ["knuckles", "leather_shoes", "plate_helmet", "booktype"],
    artifacts: "exclude",
    minProfit: 10000,
    minMarginPercent: 15,
    hideIncomplete: true,
    specialtyOnly: true,
    search: " broadsword ",
  };

  it("names each active filter", () => {
    expect(activeFilters(filters).map(({ label }) => label)).toEqual([
      "Tier 6",
      "Tier 7",
      "Enchant .1",
      "War gloves",
      "Leather shoes",
      "Plate helmet",
      "Tome",
      "No artifacts",
      "Profit ≥ 10,000",
      "Margin ≥ 15%",
      "No missing prices",
      "Specialty only",
      "Name: broadsword",
    ]);
  });

  it("has none with no filters", () => {
    expect(activeFilters(NO_FILTERS)).toEqual([]);
  });

  it("removes only the filter it names", () => {
    const tier6 = activeFilters(filters).find(
      ({ label }) => label === "Tier 6",
    );

    expect(tier6?.remove(filters)).toEqual({ ...filters, tiers: [7] });
  });

  it("removes every filter one by one", () => {
    const cleared = activeFilters(filters).reduce(
      (current, { remove }) => remove(current),
      filters,
    );

    expect(cleared).toEqual(NO_FILTERS);
  });
});
