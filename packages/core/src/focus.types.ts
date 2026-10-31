// Levels in the item's crafting tree: its mastery, the item's own
// specialization, and every other specialization in the tree.
export interface SpecializationLevels {
  mastery: number;
  spec: number;
  otherSpecs: readonly number[];
}

export interface FceParts {
  mastery: number;
  spec: number;
  otherSpecs: number;
  total: number;
}
