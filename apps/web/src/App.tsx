import type { MarketData } from "@aoc/market-prices";

import { BestCrafts } from "./BestCrafts";
import { ItemSearch } from "./ItemSearch";
import { DEFAULT_ROUTE } from "./route";
import { DEFAULT_SETTINGS } from "./settings";

export function App({ marketData }: { marketData: MarketData }) {
  return (
    <>
      <h1>Albion Crafting</h1>
      <ItemSearch />
      <BestCrafts
        marketData={marketData}
        route={DEFAULT_ROUTE}
        settings={DEFAULT_SETTINGS}
      />
    </>
  );
}
