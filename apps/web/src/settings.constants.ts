import { ARMOR_PIECES, WEAPON_TYPES } from "./filters.constants";
import type { OptionGroup } from "./route.types";
import type { CraftingSettings, ServerOption } from "./settings.types";

export const DEFAULT_SETTINGS: CraftingSettings = {
  focus: true,
  premium: true,
  stationFee: 500,
  buyMode: "instant",
  sellMode: "order",
  dailyBonuses: [],
  staleAfterHours: 12,
  manualStaleAfterDays: 3,
  preferManualPrices: false,
  server: "west",
};

export const MAX_STATION_FEE = 100_000;

export const MAX_STALE_HOURS = 168;

export const MAX_MANUAL_STALE_DAYS = 30;

export const MAX_DAILY_BONUSES = 2;

export const SERVERS: readonly ServerOption[] = [
  { id: "west", label: "Americas" },
  { id: "europe", label: "Europe" },
  { id: "east", label: "Asia" },
];

export const DAILY_BONUS_GROUPS: readonly OptionGroup[] = [
  { label: "Weapon", options: WEAPON_TYPES },
  { label: "Armor", options: ARMOR_PIECES },
  {
    label: "Offhand",
    options: [{ id: "offhand", label: "Tome, shield or torch" }],
  },
];
