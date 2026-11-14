import type {
  EnchantLevelCosts,
  EnchantPaths,
  UpgradeStep,
} from "./enchant-path.types.js";

// Path B starts from whichever lower level makes it cheapest, such as
// crafting .0 and upgrading with runes, souls and relics, or crafting .2 and
// upgrading with relics alone.
export function enchantPaths(
  level: number,
  { craft, upgrade }: EnchantLevelCosts,
): EnchantPaths {
  const direct = craft(level);
  let upgraded: EnchantPaths["upgraded"];
  let steps: UpgradeStep[] = [];
  let stepsCost = 0;
  for (let from = level - 1; from >= 0; from -= 1) {
    const step = upgrade(from + 1);
    if (step?.cost === undefined) {
      break;
    }
    steps = [{ to: from + 1, ...step, cost: step.cost }, ...steps];
    stepsCost += step.cost;
    const craftCost = craft(from);
    if (craftCost === undefined) {
      continue;
    }
    const total = craftCost + stepsCost;
    if (upgraded === undefined || total < upgraded.total) {
      upgraded = { from, craftCost, steps, total };
    }
  }
  return {
    level,
    direct,
    upgraded,
    cheaper: cheaperOf(direct, upgraded?.total),
  };
}

function cheaperOf(
  direct: number | undefined,
  upgraded: number | undefined,
): EnchantPaths["cheaper"] {
  if (direct === undefined || upgraded === undefined) {
    return direct === undefined
      ? upgraded === undefined
        ? undefined
        : "upgraded"
      : "direct";
  }
  return upgraded < direct ? "upgraded" : "direct";
}
