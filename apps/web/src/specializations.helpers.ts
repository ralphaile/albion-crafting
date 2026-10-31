import type {
  SpecializationProfile,
  TreeLevels,
} from "./specializations.types";

const NO_LEVELS: TreeLevels = { mastery: 0, specializations: {} };

export function treeLevels(
  profile: SpecializationProfile,
  treeId: string,
): TreeLevels {
  return profile[treeId] ?? NO_LEVELS;
}

// Sets the tree's mastery, or one of its specializations, and leaves out
// whatever ends up at 0.
export function withLevel(
  profile: SpecializationProfile,
  treeId: string,
  specializationId: string | undefined,
  level: number,
): SpecializationProfile {
  const tree = treeLevels(profile, treeId);
  const mastery = specializationId === undefined ? level : tree.mastery;
  const specializations = Object.fromEntries(
    Object.entries(
      specializationId === undefined
        ? tree.specializations
        : { ...tree.specializations, [specializationId]: level },
    ).filter(([, value]) => value > 0),
  );
  const rest = Object.fromEntries(
    Object.entries(profile).filter(([id]) => id !== treeId),
  );
  return mastery > 0 || Object.keys(specializations).length > 0
    ? { ...rest, [treeId]: { mastery, specializations } }
    : rest;
}
