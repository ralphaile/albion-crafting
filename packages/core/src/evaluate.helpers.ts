import type {
  CraftingPlace,
  EvaluatePrices,
  EvaluateSettings,
  Evaluation,
  Evaluations,
  Recipe,
  RecipeAlternative,
} from "./evaluate.types.js";
import { focusCost, silverPerFocus } from "./focus.helpers.js";
import { materialCost } from "./material-cost.helpers.js";
import { placeProductionBonus } from "./place-bonus.helpers.js";
import { returnRate } from "./return-rate.helpers.js";
import { revenue } from "./revenue.helpers.js";
import { stationFee } from "./station-fee.helpers.js";

// The result of each recipe for the item, the default one first.
export function evaluateEach(
  recipe: Recipe,
  place: CraftingPlace,
  settings: EvaluateSettings,
  prices: EvaluatePrices,
): Evaluations {
  const dailyBonuses = settings.dailyBonuses ?? [];
  const refining = recipe.refining ?? false;
  const bonus = placeProductionBonus(place, recipe.craftingCategory, {
    refining,
    focus: settings.focus,
    dailyBonuses,
  });
  const rrr = returnRate(bonus.total);
  const rrrWithoutFocus = settings.focus
    ? returnRate(
        placeProductionBonus(place, recipe.craftingCategory, {
          refining,
          dailyBonuses,
        }).total,
      )
    : rrr;
  const fee = stationFee(recipe.itemValue, settings.stationFee);
  const sale = revenue(prices.products.get(recipe.itemId), {
    sellMode: settings.sellMode,
    premium: settings.premium,
    undercut: settings.undercut ?? false,
  });

  function evaluateAlternative(
    alternative: RecipeAlternative,
    index: number,
  ): Evaluation {
    const costAt = (rate: number) =>
      materialCost(alternative.materials, prices.materials, {
        returnRate: rate,
        buyMode: settings.buyMode,
      });
    const cost = costAt(rrr);
    const costWithoutFocus = settings.focus ? costAt(rrrWithoutFocus) : cost;
    const focusSpent = settings.focus
      ? focusCost(alternative.focus, settings.fce?.(recipe.itemId) ?? 0)
      : undefined;
    const base = {
      itemId: recipe.itemId,
      alternative: index,
      missingPrices: [
        ...cost.lines
          .filter((line) => line.status === "missing")
          .map(({ itemId }) => itemId),
        ...(sale.status === "missing" ? [recipe.itemId] : []),
      ],
      bonus,
      rrr,
      materialCost: cost,
      stationFee: fee,
      silverCost: alternative.silver,
      revenue: sale,
      ...(focusSpent === undefined ? {} : { focusCost: focusSpent }),
    };
    if (
      cost.status === "incomplete" ||
      costWithoutFocus.status === "incomplete" ||
      fee === undefined ||
      sale.status === "missing"
    ) {
      return { ...base, status: "incomplete" };
    }

    const spentPerItem = (materials: number) =>
      (materials + fee + alternative.silver) / alternative.amountCrafted;
    const spent = spentPerItem(cost.total);
    const profit = sale.net - spent;
    // The focus pays for the whole craft, which can make several items.
    const perFocus =
      focusSpent === undefined
        ? undefined
        : silverPerFocus(
            profit * alternative.amountCrafted,
            (sale.net - spentPerItem(costWithoutFocus.total)) *
              alternative.amountCrafted,
            focusSpent,
          );
    return {
      ...base,
      status: "complete",
      profit,
      margin: spent > 0 ? profit / spent : undefined,
      ...(perFocus === undefined ? {} : { silverPerFocus: perFocus }),
    };
  }

  return [
    evaluateAlternative(recipe, 0),
    ...recipe.alternatives.map((alternative, index) =>
      evaluateAlternative(alternative, index + 1),
    ),
  ];
}

// The most profitable recipe with all its prices, or the default one while
// none has them all.
export function bestEvaluation<Result extends Evaluation>(
  evaluations: readonly [Result, ...Result[]],
): Result {
  return evaluations.reduce((best, next) =>
    next.status === "complete" &&
    (best.status === "incomplete" || next.profit > best.profit)
      ? next
      : best,
  );
}

// The recipe you chose, missing prices or not, or the best one when you chose
// none or one the item doesn't have.
export function chosenEvaluation<Result extends Evaluation>(
  evaluations: readonly [Result, ...Result[]],
  alternative: number | undefined,
): Result {
  return (
    (alternative === undefined ? undefined : evaluations[alternative]) ??
    bestEvaluation(evaluations)
  );
}

export function evaluate(
  recipe: Recipe,
  place: CraftingPlace,
  settings: EvaluateSettings,
  prices: EvaluatePrices,
  alternative?: number,
): Evaluation {
  return chosenEvaluation(
    evaluateEach(recipe, place, settings, prices),
    alternative,
  );
}
