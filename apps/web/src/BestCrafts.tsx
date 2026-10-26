import type { EvaluateSettings } from "@aoc/core";
import type { MarketData } from "@aoc/market-prices";

import { formatCount } from "./format";
import type { Route } from "./route";
import { useBestCrafts } from "./useBestCrafts";

function crafts(count: number) {
  return `${formatCount(count)} ${count === 1 ? "craft" : "crafts"}`;
}

export function BestCrafts({
  marketData,
  route,
  settings,
}: {
  marketData: MarketData;
  route: Route;
  settings: EvaluateSettings;
}) {
  const bestCrafts = useBestCrafts(marketData, route, settings);

  switch (bestCrafts.status) {
    case "loading":
      return <p role="status">Fetching market prices…</p>;
    case "error":
      return (
        <div role="alert">
          <p>Couldn’t fetch prices from the Albion Online Data Project.</p>
          <p>{bestCrafts.error.message}</p>
          <button type="button" onClick={bestCrafts.retry}>
            Try again
          </button>
        </div>
      );
    case "ready": {
      const complete = bestCrafts.crafts.filter(
        ({ status }) => status === "complete",
      ).length;
      return (
        <p>
          {crafts(complete)} with every price,{" "}
          {crafts(bestCrafts.crafts.length - complete)} missing some
        </p>
      );
    }
  }
}
