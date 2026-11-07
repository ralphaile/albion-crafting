import {
  type FocusCandidate,
  fillFocusBudget,
  type FocusBudget,
} from "@aoc/core";

import type { Craft } from "./best-crafts.types";
import { MAX_PLAN_QUANTITY } from "./plan.constants";
import {
  addToPlan,
  chosenRecipe,
  newEntry,
  plannedQuantity,
} from "./plan.helpers";
import type { CraftingPlan } from "./plan.types";
import type { RouteChoice } from "./route.types";
import type { CraftingSettings } from "./settings.types";

// The ranked crafts with every price and a focus cost. Each is capped at
// `maxQuantity`, or at what sells in a day when that's known and lower. A
// craft's profit is per item, and its recipe can make several at once.
export function focusCandidates(
  crafts: readonly Craft[],
  maxQuantity: number,
): FocusCandidate[] {
  return crafts.flatMap((craft) => {
    if (
      craft.status !== "complete" ||
      craft.focusCost === undefined ||
      craft.silverPerFocus === undefined ||
      craft.materialCost.status !== "complete"
    ) {
      return [];
    }
    const { dailyVolume } = craft;
    const { amountCrafted } = chosenRecipe(craft.recipe, craft.alternative);
    return [
      {
        itemId: craft.itemId,
        alternative: craft.alternative,
        amountCrafted,
        focusPerCraft: craft.focusCost,
        costPerCraft:
          craft.materialCost.total + (craft.stationFee ?? 0) + craft.silverCost,
        profitPerCraft: craft.profit * amountCrafted,
        silverPerFocus: craft.silverPerFocus,
        maxQuantity:
          typeof dailyVolume === "number"
            ? Math.min(maxQuantity, Math.floor(dailyVolume))
            : maxQuantity,
      },
    ];
  });
}

// Fills the budget from the ranked crafts, at the route's location. An item
// the plan already has there only fills the room left under the plan's cap.
export function fillPlan(
  plan: CraftingPlan,
  route: RouteChoice,
  crafts: readonly Craft[],
  budget: FocusBudget & { maxQuantity: number },
  settings: Pick<CraftingSettings, "dailyBonuses">,
): { plan: CraftingPlan; added: number } {
  const filled = (itemId: string, alternative: number, quantity: number) =>
    newEntry(itemId, alternative, quantity, {
      focus: true,
      dailyBonuses: settings.dailyBonuses,
    });
  const candidates = focusCandidates(crafts, budget.maxQuantity).map(
    (candidate) => ({
      ...candidate,
      maxQuantity: Math.min(
        candidate.maxQuantity,
        MAX_PLAN_QUANTITY -
          plannedQuantity(
            plan,
            route,
            filled(candidate.itemId, candidate.alternative, 0),
          ),
      ),
    }),
  );
  const picks = fillFocusBudget(candidates, budget);
  return {
    plan: picks.reduce(
      (next, { itemId, alternative, quantity }) =>
        addToPlan(next, route, filled(itemId, alternative, quantity)),
      plan,
    ),
    added: picks.length,
  };
}
