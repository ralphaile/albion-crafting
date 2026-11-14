import {
  bigint,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// One row per server, item, market and quality, in AODP's own shape. Its
// dates are when AODP saw each price, in UTC without a timezone, as AODP
// writes them. `fetched_at` is when the server last asked.
export const pricesTable = pgTable(
  "prices",
  {
    region: text().notNull(),
    itemId: text("item_id").notNull(),
    marketId: text("market_id").notNull(),
    quality: integer().notNull(),
    sellPriceMin: bigint("sell_price_min", { mode: "number" }).notNull(),
    sellPriceMinDate: text("sell_price_min_date").notNull(),
    sellPriceMax: bigint("sell_price_max", { mode: "number" }).notNull(),
    sellPriceMaxDate: text("sell_price_max_date").notNull(),
    buyPriceMin: bigint("buy_price_min", { mode: "number" }).notNull(),
    buyPriceMinDate: text("buy_price_min_date").notNull(),
    buyPriceMax: bigint("buy_price_max", { mode: "number" }).notNull(),
    buyPriceMaxDate: text("buy_price_max_date").notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.region, table.itemId, table.marketId, table.quality],
    }),
  ],
);
