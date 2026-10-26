import type { Recipe } from "@aoc/core";

export interface GameRecipe extends Recipe {
  baseId: string;
  tier: number;
  enchant: number;
  shopCategory: string;
  shopSubcategory: string;
  isArtifact: boolean;
}
