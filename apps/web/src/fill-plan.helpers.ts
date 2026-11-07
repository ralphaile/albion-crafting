import {
  type FocusCandidate,
  fillFocusBudget,
  type FocusBudget,
} from "@aoc/core";

import type { Craft } from "./best-crafts.types";
import { addToPlan, newEntry } from "./plan.helpers";
import type { CraftingPlan } from "./plan.types";
import type { RouteChoice } from "./route.types";
import type { CraftingSettings } from "./settings.types";

// The ranked crafts with every price and a focus cost. Each is capped at
// `maxQuantity`, or at what sells in a day when that's known and lower.
export function focusCandidates(
  crafts: readonly Craft[],
  maxQuantity: number,
): FocusCandidate[] {
  return crafts.flatMap((craft) => {
    if (
      craft.status !== "complete" ||
      craft.focusCost === undefined ||
      craft.materialCost.status !== "complete"
    ) {
      return [];
    }
    const { dailyVolume } = craft;
    return [
      {
        itemId: craft.itemId,
        alternative: craft.alternative,
        amountCrafted: craft.recipe.amountCrafted,
        focusPerCraft: craft.focusCost,
        costPerCraft:
          craft.materialCost.total + (craft.stationFee ?? 0) + craft.silverCost,
        profitPerCraft: craft.profit,
        maxQuantity:
          typeof dailyVolume === "number"
            ? Math.min(maxQuantity, Math.floor(dailyVolume))
            : maxQuantity,
      },
    ];
  });
}

// Fills the budget from the ranked crafts, at the route's location.
export function fillPlan(
  plan: CraftingPlan,
  route: RouteChoice,
  crafts: readonly Craft[],
  budget: FocusBudget & { maxQuantity: number },
  settings: Pick<CraftingSettings, "dailyBonuses">,
): { plan: CraftingPlan; added: number } {
  const picks = fillFocusBudget(
    focusCandidates(crafts, budget.maxQuantity),
    budget,
  );
  return {
    plan: picks.reduce(
      (filled, { itemId, alternative, quantity }) =>
        addToPlan(
          filled,
          route,
          newEntry(itemId, alternative, quantity, {
            focus: true,
            dailyBonuses: settings.dailyBonuses,
          }),
        ),
      plan,
    ),
    added: picks.length,
  };
}
