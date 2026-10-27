const NUTRITION_PER_ITEM_VALUE = 0.1125;

export function stationFee(
  itemValue: number | undefined,
  feePer100Nutrition: number,
): number | undefined {
  if (!(feePer100Nutrition >= 0) || !Number.isFinite(feePer100Nutrition)) {
    throw new RangeError(
      `A station fee must be 0 or more silver per 100 nutrition, but got ${String(feePer100Nutrition)}`,
    );
  }
  if (feePer100Nutrition === 0) {
    return 0;
  }
  return itemValue === undefined
    ? undefined
    : (itemValue * NUTRITION_PER_ITEM_VALUE * feePer100Nutrition) / 100;
}
