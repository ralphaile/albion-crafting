import { useEffect, useMemo, useState } from "react";

import type { MarketData } from "@aoc/market-prices";

import styles from "./App.module.css";
import { BestCrafts } from "./BestCrafts";
import { searchWithShownItem, shownItemFromSearch } from "./craft-url.helpers";
import { CraftingLocationBar } from "./CraftingLocationBar";
import { filtersFromSearch, searchWithFilters } from "./filters-url.helpers";
import { NO_FILTERS } from "./filters.constants";
import type { Filters } from "./filters.types";
import type { ManualPrice, ManualPriceStore } from "./manual-prices.types";
import type { MissingPrice } from "./missing-prices.types";
import { MissingPricesPanel } from "./MissingPricesPanel";
import { routeFromSearch, searchWithRoute } from "./route-url.helpers";
import { DEFAULT_ROUTE_CHOICE } from "./route.constants";
import { routeFromChoice } from "./route.helpers";
import type { RouteChoice } from "./route.types";
import {
  CRAFTING_SETTING,
  FILTERS_SETTING,
  ROUTE_SETTING,
} from "./saved-settings.constants";
import type { SettingsStore } from "./saved-settings.types";
import { DEFAULT_SETTINGS } from "./settings.constants";
import type { CraftingSettings } from "./settings.types";
import { SettingsPanel } from "./SettingsPanel";
import { useBestCrafts } from "./useBestCrafts";
import { useManualPrices } from "./useManualPrices";
import { useSavedSetting } from "./useSavedSetting";

const NO_MISSING_PRICES: readonly MissingPrice[] = [];

export function App({
  marketData,
  settingsStore,
  manualPriceStore,
  savedFilters,
  savedRoute,
  savedSettings,
  savedManualPrices,
}: {
  marketData: MarketData;
  settingsStore: SettingsStore;
  manualPriceStore: ManualPriceStore;
  savedFilters: Filters | undefined;
  savedRoute: RouteChoice | undefined;
  savedSettings: CraftingSettings | undefined;
  savedManualPrices: readonly ManualPrice[];
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
  const [settings, setSettings] = useSavedSetting(
    settingsStore,
    CRAFTING_SETTING,
    () => savedSettings ?? DEFAULT_SETTINGS,
  );
  const { manualPrices, saveManualPrice, removeManualPrice } = useManualPrices(
    manualPriceStore,
    savedManualPrices,
  );
  // One object per choice, so the crafts only recalculate when the route changes.
  const route = useMemo(() => routeFromChoice(routeChoice), [routeChoice]);
  const bestCrafts = useBestCrafts(
    marketData,
    route,
    settings,
    filters,
    manualPrices,
  );

  const [shownItemId, setShownItemId] = useState(() =>
    shownItemFromSearch(window.location.search),
  );
  // A craft the route no longer has closes, so the link doesn't keep it.
  if (
    shownItemId !== undefined &&
    bestCrafts.status === "ready" &&
    !bestCrafts.updating &&
    !bestCrafts.allCrafts.some(({ itemId }) => itemId === shownItemId)
  ) {
    setShownItemId(undefined);
  }

  useEffect(() => {
    const url = new URL(window.location.href);
    const next = searchWithShownItem(
      searchWithFilters(searchWithRoute(url.search, routeChoice), filters),
      shownItemId,
    );
    if (next !== url.search) {
      url.search = next;
      window.history.replaceState(window.history.state, "", url);
    }
  }, [filters, routeChoice, shownItemId]);

  return (
    <div className={styles.app}>
      <header className={styles.masthead}>
        <h1 className={styles.title}>Albion Crafting</h1>
        <div className={styles.actions}>
          <MissingPricesPanel
            missingPrices={
              bestCrafts.status === "loading"
                ? NO_MISSING_PRICES
                : bestCrafts.missingPrices
            }
            onSave={saveManualPrice}
            onRemove={removeManualPrice}
          />
          <SettingsPanel
            settings={settings}
            onChange={setSettings}
            onClearCache={() => marketData.clear()}
          />
        </div>
      </header>
      <main className={styles.main}>
        <CraftingLocationBar route={routeChoice} onChange={setRouteChoice} />
        <BestCrafts
          bestCrafts={bestCrafts}
          shownItemId={shownItemId}
          onShowItem={setShownItemId}
          route={route}
          settings={settings}
          filters={filters}
          onFiltersChange={setFilters}
          persistent={settingsStore.persistent}
          manualPrices={manualPrices}
          onSaveManualPrice={saveManualPrice}
          onRemoveManualPrice={removeManualPrice}
        />
      </main>
    </div>
  );
}
