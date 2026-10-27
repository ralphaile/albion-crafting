import type { CraftingPlace, EvaluateSettings } from "@aoc/core";
import { type MarketData, markets } from "@aoc/market-prices";

import styles from "./BestCrafts.module.css";
import { CraftsTable } from "./CraftsTable";
import type { Route } from "./route";
import { useBestCrafts } from "./useBestCrafts";

const SKELETON_ROWS = 8;

function marketName(marketId: string) {
  return markets.find(({ id }) => id === marketId)?.name ?? marketId;
}

function placeName(place: CraftingPlace) {
  return "location" in place ? place.location.name : "your hideout";
}

function RouteLine({
  route,
  settings,
}: {
  route: Route;
  settings: EvaluateSettings;
}) {
  const buy = marketName(route.buyMarketId);
  const sell = marketName(route.sellMarketId);
  return (
    <p className={styles.route}>
      Crafting in <strong>{placeName(route.place)}</strong>
      {buy === sell ? (
        <>
          , buying and selling in <strong>{buy}</strong>
        </>
      ) : (
        <>
          , buying in <strong>{buy}</strong> and selling in{" "}
          <strong>{sell}</strong>
        </>
      )}
      {settings.focus ? ", with focus" : ", without focus"}
    </p>
  );
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

  return (
    <div className={styles.bestCrafts}>
      <RouteLine route={route} settings={settings} />
      {bestCrafts.status === "loading" && (
        <div className={styles.loading} role="status">
          <p className={styles.loadingText}>
            Fetching market prices…{" "}
            <span className={styles.hint}>
              The first time takes a few seconds. Prices are then kept for 15
              minutes.
            </span>
          </p>
          <div className={styles.skeleton} aria-hidden="true">
            {Array.from({ length: SKELETON_ROWS }, (_, row) => (
              <div key={row} className={styles.skeletonRow} />
            ))}
          </div>
        </div>
      )}
      {bestCrafts.status === "error" && (
        <div className={styles.problem} role="alert">
          <p className={styles.problemTitle}>
            Couldn’t fetch prices from the Albion Online Data Project.
          </p>
          <p className={styles.problemHint}>
            It may be busy or down. Try again in a minute.
          </p>
          <details className={styles.details}>
            <summary>Technical details</summary>
            <p>{bestCrafts.error.message}</p>
          </details>
          <button
            type="button"
            className={styles.button}
            onClick={bestCrafts.retry}
          >
            Try again
          </button>
        </div>
      )}
      {bestCrafts.status === "ready" && (
        <CraftsTable crafts={bestCrafts.crafts} focus={settings.focus} />
      )}
    </div>
  );
}
