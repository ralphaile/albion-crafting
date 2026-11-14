import { z } from "zod";

const REGIONS = ["west", "europe", "east"] as const;

const region = z.enum(REGIONS).default("west");

function list<T>(item: z.ZodType<T, string>, { max }: { max: number }) {
  return z
    .string()
    .transform((value) =>
      value
        .split(",")
        .map((part) => part.trim())
        .filter((part) => part !== ""),
    )
    .pipe(z.array(item).min(1).max(max));
}

const itemId = z.string().regex(/^[A-Z0-9_@]{1,100}$/, "expected an item ID");
const marketId = z.string().min(1).max(50);
function whole(min: number, max: number) {
  return z
    .string()
    .regex(/^\d+$/, "expected a whole number")
    .transform(Number)
    .pipe(z.int().min(min).max(max));
}

const quality = whole(1, 5);

// What a browser sends `?focus=true` as.
function flag(fallback: boolean) {
  return z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value === undefined ? fallback : value === "true"));
}

// `/prices?items=T4_BAG,T5_BAG&locations=Caerleon&qualities=1&region=west`,
// as the web app asks AODP.
export const pricesQuerySchema = z.object({
  region,
  items: list(itemId, { max: 1000 }),
  locations: list(marketId, { max: 30 }),
  qualities: list(quality, { max: 5 }).default([1]),
});

// `/bestcrafts?location=Martlock&buy=Martlock&sell=Caerleon&tiers=4,5`: a
// city's crafts, bought in one market and sold in another, the best first.
export const bestCraftsQuerySchema = z.object({
  region,
  location: z.string().min(1).max(50),
  buy: marketId,
  sell: marketId,
  focus: flag(false),
  premium: flag(true),
  stationFee: z.coerce.number().min(0).max(100_000).default(500),
  buyMode: z.enum(["instant", "order"]).default("instant"),
  sellMode: z.enum(["order", "instant"]).default("order"),
  tiers: list(whole(4, 8), { max: 5 }).optional(),
  enchants: list(whole(0, 4), { max: 5 }).optional(),
  categories: list(z.string().max(50), { max: 50 }).optional(),
  sort: z.enum(["profit", "margin"]).default("profit"),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type BestCraftsQuery = z.output<typeof bestCraftsQuerySchema>;

// The first problem, as one line for a 400 answer.
export function queryProblem(error: z.ZodError): string {
  return z.prettifyError(error).split("\n").join(" ");
}
