import { useEffect, useMemo, useState } from "react";

import type { MarketData } from "@aoc/market-prices";

import styles from "./App.module.css";
import { BestCrafts } from "./BestCrafts";
import { filtersFromSearch, searchWithFilters } from "./filters-url.helpers";
import { NO_FILTERS } from "./filters.constants";
import type { Filters } from "./filters.types";
import { routeFromSearch, searchWithRoute } from "./route-url.helpers";
import { DEFAULT_ROUTE_CHOICE } from "./route.constants";
import { routeFromChoice } from "./route.helpers";
import type { RouteChoice } from "./route.types";
import { FILTERS_SETTING, ROUTE_SETTING } from "./saved-settings.constants";
import type { SettingsStore } from "./saved-settings.types";
import { DEFAULT_SETTINGS } from "./settings.constants";

export function App({
  marketData,
  settingsStore,
  savedFilters,
  savedRoute,
}: {
  marketData: MarketData;
  settingsStore: SettingsStore;
  savedFilters: Filters | undefined;
  savedRoute: RouteChoice | undefined;
}) {
  // A shared link wins over what this browser saved.
  const [filters, setFilters] = useState(
    () =>
      filtersFromSearch(window.location.search) ?? savedFilters ?? NO_FILTERS,
  );
  const [routeChoice] = useState(
    () =>
      routeFromSearch(window.location.search) ??
      savedRoute ??
      DEFAULT_ROUTE_CHOICE,
  );
  // One object per choice, so the crafts only recalculate when the route changes.
  const route = useMemo(() => routeFromChoice(routeChoice), [routeChoice]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const next = searchWithFilters(
      searchWithRoute(url.search, routeChoice),
      filters,
    );
    if (next !== url.search) {
      url.search = next;
      window.history.replaceState(window.history.state, "", url);
    }
  }, [filters, routeChoice]);

  useEffect(() => {
    void settingsStore.save(FILTERS_SETTING, filters);
  }, [filters, settingsStore]);

  useEffect(() => {
    void settingsStore.save(ROUTE_SETTING, routeChoice);
  }, [routeChoice, settingsStore]);

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
          route={route}
          settings={DEFAULT_SETTINGS}
          filters={filters}
          onFiltersChange={setFilters}
          persistent={settingsStore.persistent}
        />
      </main>
    </div>
  );
}
