import { Dexie, type Table } from "dexie";

import type { AodpHistory, AodpPrice, Region } from "./aodp.js";

export interface StoredPrice extends AodpPrice {
  region: Region;
  fetchedAt: number;
}

export interface StoredHistory extends AodpHistory {
  region: Region;
  fetchedAt: number;
}

export type RowKey = [
  region: Region,
  itemId: string,
  marketId: string,
  quality: number,
];

export interface RowStore<T> {
  get(keys: readonly RowKey[]): Promise<T[]>;
  put(rows: readonly T[]): Promise<void>;
}

export interface CacheStore {
  readonly persistent: boolean;
  readonly prices: RowStore<StoredPrice>;
  readonly history: RowStore<StoredHistory>;
  clear(): Promise<void>;
}

const DATABASE_NAME = "aoc-price-cache";

export async function openCacheStore(): Promise<CacheStore> {
  const db = new Dexie(DATABASE_NAME) as Dexie & {
    prices: Table<StoredPrice, RowKey>;
    history: Table<StoredHistory, RowKey>;
  };
  db.version(2).stores({
    prices: "[region+item_id+city+quality]",
    history: "[region+item_id+location+quality]",
  });
  try {
    await db.open();
  } catch {
    return createMemoryStore();
  }

  return {
    persistent: true,
    prices: tableRows(db.prices),
    history: tableRows(db.history),
    async clear() {
      await Promise.all([db.prices.clear(), db.history.clear()]);
    },
  };
}

function tableRows<T>(table: Table<T, RowKey>): RowStore<T> {
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

function createMemoryStore(): CacheStore {
  const prices = memoryRows<StoredPrice>((row) => [
    row.region,
    row.item_id,
    row.city,
    row.quality,
  ]);
  const history = memoryRows<StoredHistory>((row) => [
    row.region,
    row.item_id,
    row.location,
    row.quality,
  ]);

  return {
    persistent: false,
    prices,
    history,
    clear() {
      prices.clear();
      history.clear();
      return Promise.resolve();
    },
  };
}

function memoryRows<T>(
  keyOf: (row: T) => RowKey,
): RowStore<T> & { clear(): void } {
  const rows = new Map<string, T>();
  const id = (key: RowKey) => JSON.stringify(key);

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
