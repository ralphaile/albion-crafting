import { useState } from "react";

import styles from "./BestCrafts.module.css";
import { CraftFilters, type UpdateFilters } from "./CraftFilters";
import { CraftsTable } from "./CraftsTable";
import { NO_FILTERS } from "./filters.constants";
import { activeFilters } from "./filters.helpers";
import type { Filters } from "./filters.types";
import type { ManualPrice, ManualPriceKey } from "./manual-prices.types";
import { PricesPanel } from "./PricesPanel";
import type { Route } from "./route.types";
import type { CraftingSettings } from "./settings.types";
import type { BestCraftsResult } from "./useBestCrafts";

const SKELETON_ROWS = 8;

const IGNORE_FILTERS: UpdateFilters = () => undefined;

const NO_MANUAL_PRICES: readonly ManualPrice[] = [];

const IGNORE_MANUAL_PRICE = () => undefined;

export function BestCrafts({
  bestCrafts,
  route,
  settings,
  filters = NO_FILTERS,
  onFiltersChange = IGNORE_FILTERS,
  persistent = true,
  manualPrices = NO_MANUAL_PRICES,
  onSaveManualPrice = IGNORE_MANUAL_PRICE,
  onRemoveManualPrice = IGNORE_MANUAL_PRICE,
}: {
  bestCrafts: BestCraftsResult;
  route: Route;
  settings: CraftingSettings;
  filters?: Filters;
  onFiltersChange?: UpdateFilters;
  persistent?: boolean;
  manualPrices?: readonly ManualPrice[];
  onSaveManualPrice?: (price: ManualPrice) => void;
  onRemoveManualPrice?: (key: ManualPriceKey) => void;
}) {
  const filtered = activeFilters(filters).length > 0;
  const [pricesFor, setPricesFor] = useState<string>();
  const crafts =
    bestCrafts.status === "loading" ? undefined : bestCrafts.crafts;
  const updating = bestCrafts.status === "ready" && bestCrafts.updating;
  const pricedCraft = crafts?.find(({ itemId }) => itemId === pricesFor);

  return (
    <div className={styles.bestCrafts}>
      <CraftFilters
        filters={filters}
        onChange={onFiltersChange}
        persistent={persistent}
      />
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
      {updating && (
        <p className={styles.updating} role="status">
          Updating prices…
        </p>
      )}
      {crafts !== undefined &&
        (filtered && crafts.length === 0 && !updating ? (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>No crafts match your filters</p>
            <p>Loosen or remove a filter to see more.</p>
            <button
              type="button"
              className={styles.button}
              onClick={() => {
                onFiltersChange(() => NO_FILTERS);
              }}
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <CraftsTable
            crafts={crafts}
            focus={settings.focus}
            onShowPrices={setPricesFor}
          />
        ))}
      <PricesPanel
        craft={pricedCraft}
        region={settings.server}
        buyMarketId={route.buyMarketId}
        sellMarketId={route.sellMarketId}
        manualPrices={manualPrices}
        onSave={onSaveManualPrice}
        onRemove={onRemoveManualPrice}
        onClose={() => {
          setPricesFor(undefined);
        }}
      />
    </div>
  );
}
