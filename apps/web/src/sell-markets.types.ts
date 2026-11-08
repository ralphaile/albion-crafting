import type { Revenue } from "@aoc/core";

import type { UsedPrice } from "./best-crafts.types";

export interface SellMarketOffer {
  marketId: string;
  price: UsedPrice;
  revenue: Revenue;
  profit: number | undefined;
}

export interface SellMarketComparison {
  // The highest net first, then the markets without a price.
  offers: SellMarketOffer[];
  best: SellMarketOffer | undefined;
  current: SellMarketOffer | undefined;
  // How much more an item nets in the best market than in the current one.
  gain: number | undefined;
}
