import { useEffect, useState } from "react";

import type { MarketData } from "@aoc/market-prices";

import styles from "./App.module.css";
import { BestCrafts } from "./BestCrafts";
import { type Filters, NO_FILTERS } from "./filters";
import { filtersFromSearch, searchWithFilters } from "./filters-url";
import { DEFAULT_ROUTE } from "./route";
import type { FilterStore } from "./saved-filters";
import { DEFAULT_SETTINGS } from "./settings";

export function App({
  marketData,
  filterStore,
  savedFilters,
}: {
  marketData: MarketData;
  filterStore: FilterStore;
  savedFilters: Filters | undefined;
}) {
  // A shared link wins over what this browser saved.
  const [filters, setFilters] = useState(
    () =>
      filtersFromSearch(window.location.search) ?? savedFilters ?? NO_FILTERS,
  );

  useEffect(() => {
    const url = new URL(window.location.href);
    const next = searchWithFilters(url.search, filters);
    if (next !== url.search) {
      url.search = next;
      window.history.replaceState(window.history.state, "", url);
    }
    void filterStore.save(filters);
  }, [filters, filterStore]);

  return (
    <div className={styles.app}>
      <header className={styles.masthead}>
        <h1 className={styles.title}>Albion Crafting</h1>
        <p className={styles.tagline}>
          What to craft for your route, priced from the Albion Online Data
          Project
        </p>
      </header>
      <main className={styles.main}>
        <BestCrafts
          marketData={marketData}
          route={DEFAULT_ROUTE}
          settings={DEFAULT_SETTINGS}
          filters={filters}
          onFiltersChange={setFilters}
          persistent={filterStore.persistent}
        />
      </main>
    </div>
  );
}
