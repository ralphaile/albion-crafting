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

export interface RowStore<T> {
  get(keys: readonly PriceKey[]): Promise<T[]>;
  put(rows: readonly T[]): Promise<void>;
}

export interface PriceStore {
  readonly persistent: boolean;
  readonly prices: RowStore<StoredPrice>;
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
    prices: tableRows(db.prices),
    async clear() {
      await db.prices.clear();
    },
  };
}

function tableRows<T>(table: Table<T, PriceKey>): RowStore<T> {
  return {
    async get(keys) {
      const found = await table.bulkGet([...keys]);
      return found.filter((row) => row !== undefined);
    },
    async put(rows) {
      await table.bulkPut(rows);
    },
  };
}

function createMemoryStore(): PriceStore {
  const prices = memoryRows<StoredPrice>((row) => [
    row.region,
    row.item_id,
    row.city,
    row.quality,
  ]);

  return {
    persistent: false,
    prices,
    clear() {
      prices.clear();
      return Promise.resolve();
    },
  };
}

function memoryRows<T>(
  keyOf: (row: T) => PriceKey,
): RowStore<T> & { clear(): void } {
  const rows = new Map<string, T>();
  const id = (key: PriceKey) => JSON.stringify(key);

  return {
    get(keys) {
      return Promise.resolve(
        keys.flatMap((key) => {
          const row = rows.get(id(key));
          return row === undefined ? [] : [row];
        }),
      );
    },
    put(newRows) {
      for (const row of newRows) {
        rows.set(id(keyOf(row)), row);
      }
      return Promise.resolve();
    },
    clear() {
      rows.clear();
    },
  };
}
