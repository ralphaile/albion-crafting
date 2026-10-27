import { Dexie, type Table } from "dexie";
import { z } from "zod";

import type { SavedSetting, SettingsStore } from "./saved-settings.types";

interface StoredSetting {
  id: string;
  version: number;
  value: unknown;
}

const DATABASE_NAME = "aoc-settings";

// A value saved in a version this app doesn't know is ignored, not guessed at.
function read<T>(setting: SavedSetting<T>, stored: unknown): T | undefined {
  const parsed = z
    .object({ version: z.literal(setting.version), value: z.unknown() })
    .safeParse(stored);
  return parsed.success ? setting.parse(parsed.data.value) : undefined;
}

function record<T>({ id, version }: SavedSetting<T>, value: T): StoredSetting {
  return { id, version, value };
}

export async function openSettingsStore(): Promise<SettingsStore> {
  const db = new Dexie(DATABASE_NAME) as Dexie & {
    settings: Table<StoredSetting, string>;
  };
  db.version(1).stores({ settings: "id" });
  try {
    await db.open();
  } catch {
    return memorySettingsStore();
  }

  return {
    persistent: true,
    async load(setting) {
      try {
        return read(setting, await db.settings.get(setting.id));
      } catch {
        return undefined;
      }
    },
    async save(setting, value) {
      try {
        await db.settings.put(record(setting, value));
      } catch {
        // Saving is a convenience; the settings still work for this visit.
      }
    },
  };
}

export function memorySettingsStore(): SettingsStore {
  const saved = new Map<string, StoredSetting>();
  return {
    persistent: false,
    load: (setting) => Promise.resolve(read(setting, saved.get(setting.id))),
    save(setting, value) {
      saved.set(setting.id, record(setting, value));
      return Promise.resolve();
    },
  };
}
