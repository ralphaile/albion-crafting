import { useEffect, useMemo } from "react";

import type { MarketData } from "@aoc/market-prices";

import styles from "./App.module.css";
import { BestCrafts } from "./BestCrafts";
import { CraftingLocationBar } from "./CraftingLocationBar";
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
import { useSavedSetting } from "./useSavedSetting";

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
  const [filters, setFilters] = useSavedSetting(
    settingsStore,
    FILTERS_SETTING,
    () =>
      filtersFromSearch(window.location.search) ?? savedFilters ?? NO_FILTERS,
  );
  const [routeChoice, setRouteChoice] = useSavedSetting(
    settingsStore,
    ROUTE_SETTING,
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

  return (
    <div className={styles.app}>
      <header className={styles.masthead}>
        <h1 className={styles.title}>Albion Crafting</h1>
      </header>
      <main className={styles.main}>
        <CraftingLocationBar route={routeChoice} onChange={setRouteChoice} />
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
