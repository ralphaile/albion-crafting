export interface UpgradeStep {
  // The level the step reaches, such as 2 for .1 → .2.
  to: number;
  materialId: string;
  count: number;
  cost: number;
}

// Path A crafts the item at its level; path B crafts it lower and upgrades it
// one level at a time. Each is the silver per item, undefined without prices.
export interface EnchantPaths {
  level: number;
  direct: number | undefined;
  upgraded:
    | { from: number; craftCost: number; steps: UpgradeStep[]; total: number }
    | undefined;
  cheaper: "direct" | "upgraded" | undefined;
}

export interface EnchantLevelCosts {
  // Silver per item to craft it at that level.
  craft: (level: number) => number | undefined;
  // What upgrading one item to that level from the level below takes.
  upgrade: (
    level: number,
  ) =>
    { materialId: string; count: number; cost: number | undefined } | undefined;
}
