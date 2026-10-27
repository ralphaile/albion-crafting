export type ArtifactFilter = "include" | "exclude" | "only";

export interface Filters {
  tiers: readonly number[];
  enchants: readonly number[];
  categories: readonly string[];
  artifacts: ArtifactFilter;
  minProfit: number | undefined;
  minMarginPercent: number | undefined;
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
