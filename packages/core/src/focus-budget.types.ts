// One craft the budget can pick: what a single craft makes, costs and earns.
// `maxQuantity` caps the items made, for example at what sells in a day.
export interface FocusCandidate {
  itemId: string;
  alternative: number;
  amountCrafted: number;
  focusPerCraft: number;
  costPerCraft: number;
  profitPerCraft: number;
  maxQuantity: number;
}

// Without `silver`, there's no limit on what the materials and fees cost.
export interface FocusBudget {
  focus: number;
  silver?: number;
}

export interface FocusPick {
  itemId: string;
  alternative: number;
  crafts: number;
  quantity: number;
  focus: number;
  cost: number;
  profit: number;
}
