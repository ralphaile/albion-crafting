import { z } from "zod";

import { craftingTrees } from "@aoc/crafting-data";

import { MAX_SPECIALIZATION_LEVEL } from "./specializations.constants";
import type {
  SpecializationProfile,
  TreeLevels,
} from "./specializations.types";

const levelSchema = z.int().min(0).max(MAX_SPECIALIZATION_LEVEL).catch(0);

const treeSchema = z
  .object({
    mastery: levelSchema,
    specializations: z.record(z.string(), z.unknown()).catch({}),
  })
  .catch({ mastery: 0, specializations: {} });

const profileSchema = z.record(z.string(), z.unknown()).catch({});

// Keeps the trees and specializations it knows and leaves out every level
// that's 0 or doesn't fit, so a bad save or file never stops the app.
export function parseSpecializations(raw: unknown): SpecializationProfile {
  const trees = profileSchema.parse(raw);
  const profile: Record<string, TreeLevels> = {};
  for (const tree of craftingTrees) {
    const { mastery, specializations } = treeSchema.parse(trees[tree.id]);
    const levels = Object.fromEntries(
      tree.specializations
        .map(({ id }) => [id, levelSchema.parse(specializations[id])] as const)
        .filter(([, level]) => level > 0),
    );
    if (mastery > 0 || Object.keys(levels).length > 0) {
      profile[tree.id] = { mastery, specializations: levels };
    }
  }
  return profile;
}
