import type { PlanResult } from "@aoc/core";
import { itemName } from "@aoc/crafting-data";

import { formatCount, formatSilver } from "./format.helpers";
import type { CraftingPlan } from "./plan.types";
import type { ShoppingLine, ShoppingMarket } from "./shopping-list.types";

// Every material in the plan, added up per market it's bought in, in the
// order the plan first needs them.
export function shoppingList(
  plan: CraftingPlan,
  result: PlanResult,
): ShoppingMarket[] {
  const markets = new Map<string, Map<string, ShoppingLine>>();
  plan.locations.forEach(({ route }, index) => {
    const lines =
      markets.get(route.buyMarketId) ?? new Map<string, ShoppingLine>();
    markets.set(route.buyMarketId, lines);
    for (const entry of result.locations[index]?.entries ?? []) {
      for (const { itemId, count } of entry.materials) {
        const priced = entry.evaluation.materialCost.lines.find(
          (line) => line.itemId === itemId,
        );
        const line = lines.get(itemId) ?? {
          itemId,
          source: priced?.source ?? "sellMin",
          expected: 0,
          toBuy: 0,
        };
        line.expected += count;
        if (
          line.unitPrice === undefined &&
          priced !== undefined &&
          priced.status !== "missing"
        ) {
          line.unitPrice = priced.unitPrice;
        }
        lines.set(itemId, line);
      }
    }
  });
  return [...markets]
    .filter(([, lines]) => lines.size > 0)
    .map(([marketId, lines]) => {
      const priced = [...lines.values()].map((line): ShoppingLine => {
        const toBuy = Math.ceil(line.expected - 1e-9);
        return line.unitPrice === undefined
          ? { ...line, toBuy }
          : { ...line, toBuy, cost: toBuy * line.unitPrice };
      });
      return {
        marketId,
        lines: priced,
        total: priced.reduce((sum, { cost }) => sum + (cost ?? 0), 0),
        complete: priced.every(({ cost }) => cost !== undefined),
      };
    });
}

// Plain text to paste, for example into Discord.
export function shoppingListText(markets: readonly ShoppingMarket[]): string {
  return markets
    .map(({ marketId, lines, total, complete }) =>
      [
        marketId,
        ...lines.map(({ itemId, toBuy, unitPrice, cost }) =>
          unitPrice === undefined || cost === undefined
            ? `  ${formatCount(toBuy)} × ${itemName(itemId)} (no price)`
            : `  ${formatCount(toBuy)} × ${itemName(itemId)} at ${formatSilver(unitPrice)} = ${formatSilver(cost)}`,
        ),
        `  Total: ${formatSilver(total)}${complete ? "" : " and the items with no price"}`,
      ].join("\n"),
    )
    .join("\n\n");
}
