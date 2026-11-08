import type { MarketData } from "@aoc/market-prices";

import type { Craft } from "./best-crafts.types";
import styles from "./CompareMarkets.module.css";
import { formatSilver } from "./format.helpers";
import type { ManualPrice } from "./manual-prices.types";
import { PriceBadge } from "./PriceBadge";
import { marketName } from "./route.helpers";
import { SELL_MARKET_IDS } from "./route.schema";
import { compareSellMarkets } from "./sell-markets.helpers";
import type { CraftingSettings } from "./settings.types";
import { useMinute } from "./useMinute";
import { useSellMarketPrices } from "./useSellMarketPrices";

const SKELETON_ROWS = SELL_MARKET_IDS.length;

function silver(value: number | undefined) {
  return value === undefined ? "—" : formatSilver(value);
}

// The craft's net revenue and profit in every sell market, the best first,
// with a button to sell in each.
export function CompareMarkets({
  craft,
  marketData,
  settings,
  manualPrices,
  sellMarketId,
  onSellIn,
}: {
  craft: Craft;
  marketData: MarketData;
  settings: CraftingSettings;
  manualPrices: readonly ManualPrice[];
  sellMarketId: string;
  onSellIn: (marketId: string) => void;
}) {
  const fetched = useSellMarketPrices(
    marketData,
    craft.itemId,
    SELL_MARKET_IDS,
    settings,
  );
  const now = useMinute();

  if (fetched.status === "error") {
    return (
      <p className={styles.problem} role="alert">
        Couldn’t fetch the other markets’ prices. Open this tab again in a
        minute.
      </p>
    );
  }

  const comparison =
    fetched.status === "ready"
      ? compareSellMarkets(
          craft,
          SELL_MARKET_IDS,
          fetched,
          manualPrices,
          settings,
          sellMarketId,
          now,
        )
      : undefined;

  return (
    <table className={styles.markets} aria-busy={comparison === undefined}>
      <thead>
        <tr>
          <th scope="col">Market</th>
          <th scope="col">Net</th>
          <th scope="col">Profit</th>
          <th scope="col">
            <span className={styles.srOnly}>Sell</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {comparison === undefined
          ? Array.from({ length: SKELETON_ROWS }, (_, row) => (
              <tr key={row} className={styles.skeleton} aria-hidden="true">
                <td colSpan={4} />
              </tr>
            ))
          : comparison.offers.map((offer) => {
              const name = marketName(offer.marketId);
              const best = offer === comparison.best;
              const selling = offer.marketId === sellMarketId;
              return (
                <tr
                  key={offer.marketId}
                  data-best={best}
                  data-current={selling}
                >
                  <th scope="row">
                    <span className={styles.name}>
                      {name}
                      {best && <span className={styles.tag}>Best</span>}
                    </span>
                    <span className={styles.price}>
                      <PriceBadge price={offer.price} announceName>
                        {offer.price.status === "missing"
                          ? "no price"
                          : formatSilver(offer.price.value)}
                      </PriceBadge>
                    </span>
                  </th>
                  <td>
                    {silver(
                      offer.revenue.status === "missing"
                        ? undefined
                        : offer.revenue.net,
                    )}
                  </td>
                  <td
                    data-loss={offer.profit !== undefined && offer.profit < 0}
                  >
                    {silver(offer.profit)}
                    {best && comparison.gain !== undefined && (
                      <span className={styles.gain}>
                        +{formatSilver(comparison.gain)} vs{" "}
                        {marketName(sellMarketId)}
                      </span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className={styles.sell}
                      aria-pressed={selling}
                      aria-label={`Sell in ${name}`}
                      onClick={() => {
                        onSellIn(offer.marketId);
                      }}
                    >
                      {selling ? "Selling" : "Sell here"}
                    </button>
                  </td>
                </tr>
              );
            })}
      </tbody>
    </table>
  );
}
