import { z } from "zod";

import type { Region } from "@aoc/market-prices";

import {
  DAILY_BONUS_GROUPS,
  DEFAULT_SETTINGS,
  MAX_DAILY_BONUSES,
  MAX_STALE_HOURS,
  MAX_STATION_FEE,
  SERVERS,
} from "./settings.constants";
import type { CraftingSettings } from "./settings.types";

export const serverSchema = z.custom<Region>((value) =>
  SERVERS.some(({ id }) => id === value),
);

const dailyBonusCategories = DAILY_BONUS_GROUPS.flatMap(({ options }) =>
  options.map(({ id }) => id),
);

const dailyBonusSchema = z.object({
  category: z
    .string()
    .refine((category) => dailyBonusCategories.includes(category)),
  bonus: z.union([z.literal(0.1), z.literal(0.2)]),
});

const settingsSchema = z.object({
  focus: z.boolean().catch(DEFAULT_SETTINGS.focus),
  premium: z.boolean().catch(DEFAULT_SETTINGS.premium),
  stationFee: z
    .int()
    .min(0)
    .max(MAX_STATION_FEE)
    .catch(DEFAULT_SETTINGS.stationFee),
  buyMode: z.enum(["instant", "order"]).catch(DEFAULT_SETTINGS.buyMode),
  sellMode: z.enum(["order", "instant"]).catch(DEFAULT_SETTINGS.sellMode),
  dailyBonuses: z
    .array(z.unknown())
    .transform((values) =>
      values
        .flatMap((value) => {
          const parsed = dailyBonusSchema.safeParse(value);
          return parsed.success ? [parsed.data] : [];
        })
        .slice(0, MAX_DAILY_BONUSES),
    )
    .catch([]),
  staleAfterHours: z
    .int()
    .min(1)
    .max(MAX_STALE_HOURS)
    .catch(DEFAULT_SETTINGS.staleAfterHours),
  server: serverSchema.catch(DEFAULT_SETTINGS.server),
});

// Each setting that doesn't fit falls back to its default, so a bad save never
// stops the app from opening.
export function parseSettings(raw: unknown): CraftingSettings {
  const parsed = settingsSchema.safeParse(raw);
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}
