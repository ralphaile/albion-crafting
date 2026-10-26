import { Dexie, type Table } from "dexie";

import type { AodpPrice, Region } from "./aodp.js";

export interface StoredPrice extends AodpPrice {
  region: Region;
  fetchedAt: number;
}

export type PriceKey = [
  region: Region,
  itemId: string,
  location: string,
  quality: number,
];

export interface PriceStore {
  readonly persistent: boolean;
  get(keys: readonly PriceKey[]): Promise<StoredPrice[]>;
  put(prices: readonly StoredPrice[]): Promise<void>;
  clear(): Promise<void>;
}

const DATABASE_NAME = "aoc-price-cache";

export async function openPriceStore(): Promise<PriceStore> {
  const db = new Dexie(DATABASE_NAME) as Dexie & {
    prices: Table<StoredPrice, PriceKey>;
  };
  db.version(1).stores({ prices: "[region+item_id+city+quality]" });
  try {
    await db.open();
  } catch {
    return createMemoryStore();
  }

  return {
    persistent: true,
    async get(keys) {
      const found = await db.prices.bulkGet([...keys]);
      return found.filter((price) => price !== undefined);
    },
    async put(prices) {
      await db.prices.bulkPut(prices);
    },
    async clear() {
      await db.prices.clear();
    },
  };
}

function createMemoryStore(): PriceStore {
  const prices = new Map<string, StoredPrice>();
  const id = (key: PriceKey) => JSON.stringify(key);

  return {
    persistent: false,
    get(keys) {
      return Promise.resolve(keys.flatMap((key) => prices.get(id(key)) ?? []));
    },
    put(rows) {
      for (const row of rows) {
        prices.set(id([row.region, row.item_id, row.city, row.quality]), row);
      }
      return Promise.resolve();
    },
    clear() {
      prices.clear();
      return Promise.resolve();
    },
  };
}
