export interface Resource {
  id: string;
  count: number;
  returnable: boolean;
}

export interface Alternative {
  focus: number;
  silver: number;
  amountCrafted: number;
  materials: Resource[];
}

export interface Recipe extends Alternative {
  itemId: string;
  baseId: string;
  tier: number;
  enchant: number;
  craftingCategory?: string;
  shopCategory: string;
  shopSubcategory: string;
  isArtifact: boolean;
  alternatives: Alternative[];
  itemValue?: number;
}
