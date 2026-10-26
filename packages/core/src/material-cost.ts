export interface Material {
  id: string;
  count: number;
  returnable: boolean;
}

export type MarketPrice =
  { status: "missing" } | { status: "fresh" | "stale"; value: number };

export interface MaterialPrices {
  sellMin: MarketPrice;
  buyMax: MarketPrice;
}

export type BuyMode = "instant" | "order";

interface LineBase {
  itemId: string;
  count: number;
  effectiveCount: number;
  source: keyof MaterialPrices;
}

export type MaterialLine =
  | (LineBase & { status: "missing" })
  | (LineBase & {
      status: "fresh" | "stale";
      unitPrice: number;
      cost: number;
    });

export type MaterialCost =
  | { status: "complete"; lines: MaterialLine[]; total: number }
  | { status: "incomplete"; lines: MaterialLine[] };

export interface MaterialCostOptions {
  returnRate: number;
  buyMode: BuyMode;
}

const SETUP_FEE = 0.025;

export function materialCost(
  materials: readonly Material[],
  prices: ReadonlyMap<string, MaterialPrices>,
  { returnRate, buyMode }: MaterialCostOptions,
): MaterialCost {
  const source: keyof MaterialPrices =
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
