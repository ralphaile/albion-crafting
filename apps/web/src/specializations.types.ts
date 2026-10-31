// A crafting tree's mastery level and its specializations' levels, by
// specialization ID. A level left out is 0.
export interface TreeLevels {
  mastery: number;
  specializations: Readonly<Record<string, number>>;
}

// By tree ID. A tree left out has every level at 0.
export type SpecializationProfile = Readonly<Record<string, TreeLevels>>;
