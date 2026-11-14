import type { Recipe } from "@aoc/core";

export interface GameRecipe extends Recipe {
  baseId: string;
  tier: number;
  enchant: number;
  shopCategory: string;
  shopSubcategory: string;
  isArtifact: boolean;
  // What turns the item one enchantment level lower into this one, such as
  // 288 T5_RUNE for T5_MAIN_SWORD@1.
  upgrade?: { id: string; count: number };
}
