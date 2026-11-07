import {
  FCE_PER_MASTERY_LEVEL,
  FCE_PER_OTHER_SPEC_LEVEL,
  FCE_PER_SPEC_LEVEL,
  FOCUS_PER_DAY,
  MAX_STORED_FOCUS,
} from "./focus.constants.js";
import type { FceParts, SpecializationLevels } from "./focus.types.js";

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

export function specializationFce({
  mastery,
  spec,
  otherSpecs,
}: SpecializationLevels): FceParts {
  for (const level of [mastery, spec, ...otherSpecs]) {
    if (!(level >= 0) || !Number.isFinite(level)) {
      throw new RangeError(
        `A level must be 0 or more, but got ${String(level)}`,
      );
    }
  }
  const parts = {
    mastery: mastery * FCE_PER_MASTERY_LEVEL,
    spec: spec * FCE_PER_SPEC_LEVEL,
    otherSpecs:
      otherSpecs.reduce((sum, level) => sum + level, 0) *
      FCE_PER_OTHER_SPEC_LEVEL,
  };
  return { ...parts, total: parts.mastery + parts.spec + parts.otherSpecs };
}

// The days of regained focus it takes to have `needed`, starting from `stored`,
// which can't be above what a character stores. 0 when there's enough now.
export function focusDays(needed: number, stored: number): number {
  const missing = needed - Math.min(Math.max(stored, 0), MAX_STORED_FOCUS);
  return missing <= 0 ? 0 : Math.ceil(missing / FOCUS_PER_DAY);
}
