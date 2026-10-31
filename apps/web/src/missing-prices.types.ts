import type { ManualPriceKey } from "./manual-prices.types";

export interface MissingPrice {
  key: ManualPriceKey;
  // How many incomplete crafts need it.
  craftCount: number;
}
