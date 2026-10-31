// `itemId` is its lowest tier, to show its icon.
export interface Specialization {
  id: string;
  name: string;
  itemId: string;
}

// A tree of the destiny board, such as Sword or Plate armor: one mastery, and a
// specialization for each item in it.
export interface CraftingTree {
  id: string;
  specializations: readonly Specialization[];
}

export interface SpecializationOf {
  treeId: string;
  specializationId: string;
}
