import type { Filters } from "./filters.types";

export interface FilterStore {
  readonly persistent: boolean;
  load(): Promise<Filters | undefined>;
  save(filters: Filters): Promise<void>;
}
