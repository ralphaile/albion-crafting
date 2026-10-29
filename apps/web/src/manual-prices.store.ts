import { Dexie, type Table } from "dexie";

import { parseManualPrices } from "./manual-prices.schema";
import type {
  ManualPrice,
  ManualPriceKey,
  ManualPriceStore,
} from "./manual-prices.types";

// Apart from the price cache, so clearing the cache never loses typed prices.
const DATABASE_NAME = "aoc-manual-prices";

type StoredKey = [string, string, string, number, string];

function storedKey({
  region,
  itemId,
  marketId,
  quality,
  source,
}: ManualPriceKey): StoredKey {
  return [region, itemId, marketId, quality, source];
}

export async function openManualPriceStore(): Promise<ManualPriceStore> {
  const db = new Dexie(DATABASE_NAME) as Dexie & {
    prices: Table<ManualPrice, StoredKey>;
  };
  db.version(1).stores({ prices: "[region+itemId+marketId+quality+source]" });
  try {
    await db.open();
  } catch {
    return memoryManualPriceStore();
  }

  return {
    persistent: true,
    async list() {
      try {
        return parseManualPrices(await db.prices.toArray());
      } catch {
        return [];
      }
    },
    async save(price) {
      try {
        await db.prices.put(price);
      } catch {
        // The price still counts for this visit.
      }
    },
    async remove(key) {
      try {
        await db.prices.delete(storedKey(key));
      } catch {
        // Removed for this visit; it may come back next time.
      }
    },
  };
}

export function memoryManualPriceStore(): ManualPriceStore {
  const saved = new Map<string, ManualPrice>();
  const id = (key: ManualPriceKey) => JSON.stringify(storedKey(key));
  return {
    persistent: false,
    list: () => Promise.resolve([...saved.values()]),
    save(price) {
      saved.set(id(price), price);
      return Promise.resolve();
    },
    remove(key) {
      saved.delete(id(key));
      return Promise.resolve();
    },
  };
}
