export function returnRate(productionBonus: number): number {
  return productionBonus / (1 + productionBonus);
}

export function bonusForReturnRate(rate: number): number {
  if (!(rate >= 0 && rate < 1)) {
    throw new RangeError(
      `A return rate must be at least 0 and below 1, but got ${String(rate)}`,
    );
  }
  return rate / (1 - rate);
}
