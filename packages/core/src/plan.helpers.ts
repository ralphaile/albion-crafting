import { evaluateEach } from "./evaluate.helpers.js";
import type { CraftingPlace, EvaluatePrices } from "./evaluate.types.js";
import type {
  PlanEntry,
  PlanLocation,
  PlanResult,
  PlanSettings,
  PlanTotals,
  PlannedEntry,
} from "./plan.types.js";

// What returns are expected to leave you using, as whole items to buy.
function wholeItems(expected: number): number {
  return Math.ceil(expected - 1e-9);
}

// Materials are bought, and so priced, in whole items.
function planEntry(
  entry: PlanEntry,
  place: CraftingPlace,
  prices: EvaluatePrices,
  settings: PlanSettings,
): PlannedEntry {
  const evaluations = evaluateEach(
    entry.recipe,
    place,
    { ...settings, focus: entry.focus, dailyBonuses: entry.dailyBonuses },
    prices,
  );
  const evaluation = evaluations[entry.alternative] ?? evaluations[0];
  const recipe =
    evaluation.alternative === 0
      ? entry.recipe
      : (entry.recipe.alternatives[evaluation.alternative - 1] ?? entry.recipe);
  const crafts = Math.ceil(entry.quantity / recipe.amountCrafted);
  const base = {
    evaluation,
    crafts,
    made: crafts * recipe.amountCrafted,
    materials: evaluation.materialCost.lines.map(
      ({ itemId, effectiveCount }) => ({
        itemId,
        count: wholeItems(effectiveCount * crafts),
      }),
    ),
    focus: (evaluation.focusCost ?? 0) * crafts,
  };
  if (
    evaluation.status === "incomplete" ||
    evaluation.materialCost.status === "incomplete" ||
    evaluation.stationFee === undefined ||
    evaluation.revenue.status === "missing"
  ) {
    return { ...base, status: "incomplete" };
  }
  const materialCost = evaluation.materialCost.lines.reduce(
    (sum, line, index) =>
      sum +
      (line.status === "missing"
        ? 0
        : line.unitPrice * (base.materials[index]?.count ?? 0)),
    0,
  );
  const cost =
    materialCost + (evaluation.stationFee + evaluation.silverCost) * crafts;
  const revenue = evaluation.revenue.net * base.made;
  return {
    ...base,
    status: "complete",
    cost,
    revenue,
    profit: revenue - cost,
  };
}

function totalsOf(results: readonly PlannedEntry[]): PlanTotals {
  const totals: PlanTotals = {
    status: "complete",
    focus: 0,
    cost: 0,
    revenue: 0,
    profit: 0,
    missingPrices: [
      ...new Set(results.flatMap(({ evaluation }) => evaluation.missingPrices)),
    ],
  };
  for (const result of results) {
    totals.focus += result.focus;
    if (result.status === "incomplete") {
      totals.status = "incomplete";
    } else {
      totals.cost += result.cost;
      totals.revenue += result.revenue;
      totals.profit += result.profit;
    }
  }
  return totals;
}

function sumTotals(totals: readonly PlanTotals[]): PlanTotals {
  return {
    status: totals.every(({ status }) => status === "complete")
      ? "complete"
      : "incomplete",
    focus: totals.reduce((sum, { focus }) => sum + focus, 0),
    cost: totals.reduce((sum, { cost }) => sum + cost, 0),
    revenue: totals.reduce((sum, { revenue }) => sum + revenue, 0),
    profit: totals.reduce((sum, { profit }) => sum + profit, 0),
    missingPrices: [
      ...new Set(totals.flatMap(({ missingPrices }) => missingPrices)),
    ],
  };
}

// Each entry is evaluated at its own location, with that location's prices.
export function evaluatePlan(
  locations: readonly PlanLocation[],
  settings: PlanSettings,
): PlanResult {
  const planned = locations.map(({ place, prices, sellMode, entries }) => {
    const here = sellMode === undefined ? settings : { ...settings, sellMode };
    const results = entries.map((entry) =>
      planEntry(entry, place, prices, here),
    );
    return { entries: results, totals: totalsOf(results) };
  });
  return {
    locations: planned,
    totals: sumTotals(planned.map(({ totals }) => totals)),
  };
}
