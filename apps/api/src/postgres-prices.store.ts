import { fileURLToPath } from "node:url";

import { and, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import type { AodpPrice } from "@aoc/market-prices";

import type { PriceStore } from "./price-store.types.js";
import { pricesTable } from "./prices.table.js";

// Under Postgres's 65,535 parameters a statement, at 13 a row.
const ROWS_PER_INSERT = 2000;

const MIGRATIONS = fileURLToPath(new URL("../drizzle", import.meta.url));

// Opens the database and brings its tables up to date.
export async function openPostgresPriceStore(url: string): Promise<PriceStore> {
  const client = postgres(url, { max: 10, onnotice: () => undefined });
  const db = drizzle(client);
  await migrate(db, { migrationsFolder: MIGRATIONS });

  return {
    async save(region, rows, fetchedAt) {
      for (let at = 0; at < rows.length; at += ROWS_PER_INSERT) {
        const chunk = rows.slice(at, at + ROWS_PER_INSERT);
        await db
          .insert(pricesTable)
          .values(
            chunk.map((row) => ({
              region,
              itemId: row.item_id,
              marketId: row.city,
              quality: row.quality,
              sellPriceMin: row.sell_price_min,
              sellPriceMinDate: row.sell_price_min_date,
              sellPriceMax: row.sell_price_max,
              sellPriceMaxDate: row.sell_price_max_date,
              buyPriceMin: row.buy_price_min,
              buyPriceMinDate: row.buy_price_min_date,
              buyPriceMax: row.buy_price_max,
              buyPriceMaxDate: row.buy_price_max_date,
              fetchedAt: new Date(fetchedAt),
            })),
          )
          .onConflictDoUpdate({
            target: [
              pricesTable.region,
              pricesTable.itemId,
              pricesTable.marketId,
              pricesTable.quality,
            ],
            set: {
              sellPriceMin: sql`excluded.sell_price_min`,
              sellPriceMinDate: sql`excluded.sell_price_min_date`,
              sellPriceMax: sql`excluded.sell_price_max`,
              sellPriceMaxDate: sql`excluded.sell_price_max_date`,
              buyPriceMin: sql`excluded.buy_price_min`,
              buyPriceMinDate: sql`excluded.buy_price_min_date`,
              buyPriceMax: sql`excluded.buy_price_max`,
              buyPriceMaxDate: sql`excluded.buy_price_max_date`,
              fetchedAt: sql`excluded.fetched_at`,
            },
          });
      }
    },

    async read(region, itemIds, marketIds, qualities) {
      if (
        itemIds.length === 0 ||
        marketIds.length === 0 ||
        qualities.length === 0
      ) {
        return { rows: [], fetchedAt: undefined };
      }
      const found = await db
        .select()
        .from(pricesTable)
        .where(
          and(
            eq(pricesTable.region, region),
            inArray(pricesTable.itemId, [...itemIds]),
            inArray(pricesTable.quality, [...qualities]),
            inArray(
              sql`lower(${pricesTable.marketId})`,
              marketIds.map((marketId) => marketId.toLowerCase()),
            ),
          ),
        );
      const rows = found.map((row): AodpPrice => ({
        item_id: row.itemId,
        city: row.marketId,
        quality: row.quality,
        sell_price_min: row.sellPriceMin,
        sell_price_min_date: row.sellPriceMinDate,
        sell_price_max: row.sellPriceMax,
        sell_price_max_date: row.sellPriceMaxDate,
        buy_price_min: row.buyPriceMin,
        buy_price_min_date: row.buyPriceMinDate,
        buy_price_max: row.buyPriceMax,
        buy_price_max_date: row.buyPriceMaxDate,
      }));
      const oldest = found.reduce<number | undefined>(
        (at, row) => Math.min(at ?? Infinity, row.fetchedAt.getTime()),
        undefined,
      );
      return { rows, fetchedAt: oldest };
    },

    async ping() {
      await db.execute(sql`select 1`);
    },

    close: () => client.end({ timeout: 5 }),
  };
}
