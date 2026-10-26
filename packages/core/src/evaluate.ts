import { focusCost, silverPerFocus } from "./focus.js";
import {
  type Hideout,
  hideoutProductionBonus,
  type HideoutProductionBonus,
} from "./hideout-bonus.js";
import type { OrderPrices } from "./market.js";
import {
  type BuyMode,
  type Material,
  materialCost,
  type MaterialCost,
} from "./material-cost.js";
import {
  type CraftingSite,
  type DailyBonus,
  productionBonus,
  type ProductionBonus,
  type ProductionBonusOptions,
} from "./production-bonus.js";
import { returnRate } from "./return-rate.js";
import { revenue, type Revenue, type SellMode } from "./revenue.js";
import { stationFee } from "./station-fee.js";

export interface RecipeVariant {
  focus: number;
  silver: number;
  amountCrafted: number;
  resources: readonly Material[];
}

export interface CraftRecipe extends RecipeVariant {
  itemId: string;
  craftingCategory?: string;
  itemValue?: number;
  alternatives: readonly RecipeVariant[];
}

export type CraftingPlace = { location: CraftingSite } | { hideout: Hideout };

export interface EvaluateSettings {
  focus: boolean;
  premium: boolean;
  buyMode: BuyMode;
  sellMode: SellMode;
  undercut?: boolean;
  stationFee: number;
  dailyBonuses?: readonly DailyBonus[];
  fce?: (itemId: string) => number;
}

export interface EvaluatePrices {
  materials: ReadonlyMap<string, OrderPrices>;
  products: ReadonlyMap<string, OrderPrices>;
}

interface EvaluationBase {
  itemId: string;
  alternative: number;
  missingPrices: string[];
  bonus: ProductionBonus | HideoutProductionBonus;
  rrr: number;
  materialCost: MaterialCost;
  stationFee: number | undefined;
  silverCost: number;
  revenue: Revenue;
  focusCost?: number;
}

export type Evaluation =
  | (EvaluationBase & { status: "incomplete" })
  | (EvaluationBase & {
      status: "complete";
      profit: number;
      margin: number | undefined;
      silverPerFocus?: number;
    });

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
  recipe: CraftRecipe,
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

  function evaluateVariant(
    variant: RecipeVariant,
    alternative: number,
  ): Evaluation {
    const costAt = (rate: number) =>
      materialCost(variant.resources, prices.materials, {
        returnRate: rate,
        buyMode: settings.buyMode,
      });
    const cost = costAt(rrr);
    const costWithoutFocus = settings.focus ? costAt(rrrWithoutFocus) : cost;
    const focusSpent = settings.focus
      ? focusCost(variant.focus, settings.fce?.(recipe.itemId) ?? 0)
      : undefined;
    const base = {
      itemId: recipe.itemId,
      alternative,
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
      silverCost: variant.silver,
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
      (materials + fee + variant.silver) / variant.amountCrafted;
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
    evaluateVariant(recipe, 0),
    ...recipe.alternatives.map((variant, index) =>
      evaluateVariant(variant, index + 1),
    ),
  ].reduce((best, next) =>
    next.status === "complete" &&
    (best.status === "incomplete" || next.profit > best.profit)
      ? next
      : best,
  );
}
