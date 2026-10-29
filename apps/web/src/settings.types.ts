import type { BuyMode, DailyBonus, SellMode } from "@aoc/core";
import type { Region } from "@aoc/market-prices";

export interface CraftingSettings {
  focus: boolean;
  premium: boolean;
  stationFee: number;
  buyMode: BuyMode;
  // The Black Market is picked as the sell market, not as a way of selling.
  sellMode: Exclude<SellMode, "blackMarket">;
  dailyBonuses: readonly DailyBonus[];
  staleAfterHours: number;
  manualStaleAfterDays: number;
  preferManualPrices: boolean;
  server: Region;
}

export interface ServerOption {
  id: Region;
  label: string;
}
