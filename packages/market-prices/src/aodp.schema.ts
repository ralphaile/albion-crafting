import { z } from "zod";

const date = z.iso.datetime({ local: true });

export const pricesSchema = z.array(
  z.object({
    item_id: z.string(),
    city: z.string(),
    quality: z.int(),
    sell_price_min: z.number(),
    sell_price_min_date: date,
    sell_price_max: z.number(),
    sell_price_max_date: date,
    buy_price_min: z.number(),
    buy_price_min_date: date,
    buy_price_max: z.number(),
    buy_price_max_date: date,
  }),
);

export type AodpPrice = z.output<typeof pricesSchema>[number];

export const historySchema = z.array(
  z.object({
    location: z.string(),
    item_id: z.string(),
    quality: z.int(),
    data: z.array(
      z.object({
        item_count: z.int(),
        avg_price: z.number(),
        timestamp: date,
      }),
    ),
  }),
);

export type AodpHistory = z.output<typeof historySchema>[number];
