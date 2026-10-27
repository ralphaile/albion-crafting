import type {
  CraftingPlace,
  EvaluatePrices,
  EvaluateSettings,
  Evaluation,
  Recipe,
  RecipeAlternative,
} from "./evaluate.types.js";
import { focusCost, silverPerFocus } from "./focus.helpers.js";
import { hideoutProductionBonus } from "./hideout-bonus.helpers.js";
import { materialCost } from "./material-cost.helpers.js";
import { productionBonus } from "./production-bonus.helpers.js";
import type { ProductionBonusOptions } from "./production-bonus.types.js";
import { returnRate } from "./return-rate.helpers.js";
import { revenue } from "./revenue.helpers.js";
import { stationFee } from "./station-fee.helpers.js";

function bonusAt(
  place: CraftingPlace,
  craftingCategory: string | undefined,
  options: ProductionBonusOptions,
) {
  return "hideout" in place
    ? hideoutProductionBonus(place.hideout, craftingCategory, options)
    : productionBonus(place.location, craftingCategory, options);
}

export function evaluate(
  recipe: Recipe,
  place: CraftingPlace,
  settings: EvaluateSettings,
  prices: EvaluatePrices,
): Evaluation {
  const dailyBonuses = settings.dailyBonuses ?? [];
  const bonus = bonusAt(place, recipe.craftingCategory, {
    focus: settings.focus,
    dailyBonuses,
  });
  const rrr = returnRate(bonus.total);
  const rrrWithoutFocus = settings.focus
    ? returnRate(
        bonusAt(place, recipe.craftingCategory, { dailyBonuses }).total,
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
    const perFocus =
      focusSpent === undefined
        ? undefined
        : silverPerFocus(
            profit,
            sale.net - spentPerItem(costWithoutFocus.total),
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
  ].reduce((best, next) =>
    next.status === "complete" &&
    (best.status === "incomplete" || next.profit > best.profit)
      ? next
      : best,
  );
}
