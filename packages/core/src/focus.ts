export const FOCUS_PER_DAY = 10_000;
export const MAX_STORED_FOCUS = 30_000;

const FCE_PER_HALVING = 10_000;

export function focusCost(baseFocus: number, fce = 0): number {
  if (!(fce >= 0) || !Number.isFinite(fce)) {
    throw new RangeError(`FCE must be 0 or more, but got ${String(fce)}`);
  }
  return baseFocus * 0.5 ** (fce / FCE_PER_HALVING);
}

export function silverPerFocus(
  profitWithFocus: number,
  profitWithoutFocus: number,
  cost: number,
): number | undefined {
  return cost > 0 ? (profitWithFocus - profitWithoutFocus) / cost : undefined;
}
