export type ArtifactFilter = "include" | "exclude" | "only";

export type CraftMode = "crafting" | "refining";

// `mode` picks what's ranked. It's kept with the filters, so it's saved and in
// the link, but it isn't one: it gets no chip, and Clear all keeps it.
export interface Filters {
  mode: CraftMode;
  tiers: readonly number[];
  enchants: readonly number[];
  categories: readonly string[];
  artifacts: ArtifactFilter;
  minProfit: number | undefined;
  minMarginPercent: number | undefined;
  minDailyVolume: number | undefined;
  hideIncomplete: boolean;
  specialtyOnly: boolean;
  search: string;
}

export interface Option {
  id: string;
  label: string;
}

export interface ActiveFilter {
  id: string;
  label: string;
  remove: (filters: Filters) => Filters;
}
