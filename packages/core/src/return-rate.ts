export function returnRate(productionBonus: number): number {
  return productionBonus / (1 + productionBonus);
}
