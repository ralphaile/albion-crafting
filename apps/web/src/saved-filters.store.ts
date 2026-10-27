import { Dexie, type Table } from "dexie";
import { z } from "zod";

import { parseFilters } from "./filters.schema";
import type { Filters } from "./filters.types";
import type { FilterStore } from "./saved-filters.types";

interface SavedSetting {
  id: string;
  version: number;
  value: unknown;
}

const DATABASE_NAME = "aoc-settings";
const FILTERS_ID = "filters";
const FILTERS_VERSION = 1;

const savedFiltersSchema = z.object({
  version: z.literal(FILTERS_VERSION),
  value: z.unknown(),
});

function read(saved: unknown): Filters | undefined {
  const parsed = savedFiltersSchema.safeParse(saved);
  return parsed.success ? parseFilters(parsed.data.value) : undefined;
}

function record(filters: Filters): SavedSetting {
  return { id: FILTERS_ID, version: FILTERS_VERSION, value: filters };
}

export async function openFilterStore(): Promise<FilterStore> {
  const db = new Dexie(DATABASE_NAME) as Dexie & {
    settings: Table<SavedSetting, string>;
  };
  db.version(1).stores({ settings: "id" });
  try {
    await db.open();
  } catch {
    return memoryFilterStore();
  }

  return {
    persistent: true,
    async load() {
      try {
        return read(await db.settings.get(FILTERS_ID));
      } catch {
        return undefined;
      }
    },
    async save(filters) {
      try {
        await db.settings.put(record(filters));
      } catch {
        // Saving is a convenience; the filters still work for this visit.
      }
    },
  };
}

export function memoryFilterStore(): FilterStore {
  let saved: SavedSetting | undefined;
  return {
    persistent: false,
    load: () => Promise.resolve(read(saved)),
    save(filters) {
      saved = record(filters);
      return Promise.resolve();
    },
  };
}
