import { SETUP_FEE } from "./market.constants.js";
import type { OrderPrices } from "./market.types.js";
import type {
  Material,
  MaterialCost,
  MaterialCostOptions,
  MaterialLine,
} from "./material-cost.types.js";

export function materialCost(
  materials: readonly Material[],
  prices: ReadonlyMap<string, OrderPrices>,
  { returnRate, buyMode }: MaterialCostOptions,
): MaterialCost {
  const source: keyof OrderPrices =
    buyMode === "instant" ? "sellMin" : "buyMax";
  const lines = materials.map(({ id, count, returnable }): MaterialLine => {
    const base = {
      itemId: id,
      count,
      effectiveCount: returnable ? count * (1 - returnRate) : count,
      source,
    };
    const price = prices.get(id)?.[source];
    if (price === undefined || price.status === "missing") {
      return { ...base, status: "missing" };
    }
    const unitPrice =
      buyMode === "order" ? price.value * (1 + SETUP_FEE) : price.value;
    return {
      ...base,
      status: price.status,
      unitPrice,
      cost: base.effectiveCount * unitPrice,
    };
  });

  let total = 0;
  for (const line of lines) {
    if (line.status === "missing") {
      return { status: "incomplete", lines };
    }
    total += line.cost;
  }
  return { status: "complete", lines, total };
}
