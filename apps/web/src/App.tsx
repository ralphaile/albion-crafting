import { useEffect, useMemo, useState } from "react";

import type { MarketData } from "@aoc/market-prices";

import styles from "./App.module.css";
import { BestCrafts } from "./BestCrafts";
import { searchWithShownItem, shownItemFromSearch } from "./craft-url.helpers";
import { CraftingLocationBar } from "./CraftingLocationBar";
import { fillPlan } from "./fill-plan.helpers";
import { filtersFromSearch, searchWithFilters } from "./filters-url.helpers";
import { NO_FILTERS } from "./filters.constants";
import type { Filters } from "./filters.types";
import { Footer, LegalPage } from "./LegalPages";
import type { ManualPrice, ManualPriceStore } from "./manual-prices.types";
import type { MissingPrice } from "./missing-prices.types";
import { MissingPricesPanel } from "./MissingPricesPanel";
import { NO_PLAN } from "./plan.constants";
import { addToPlan, newEntry } from "./plan.helpers";
import type { CraftingPlan } from "./plan.types";
import { PlanPage } from "./PlanPage";
import { routeFromSearch, searchWithRoute } from "./route-url.helpers";
import { DEFAULT_ROUTE_CHOICE } from "./route.constants";
import { routeFromChoice } from "./route.helpers";
import type { RouteChoice } from "./route.types";
import {
  CRAFTING_SETTING,
  FILTERS_SETTING,
  PLAN_SETTING,
  ROUTE_SETTING,
  SPECIALIZATIONS_SETTING,
} from "./saved-settings.constants";
import type { SettingsStore } from "./saved-settings.types";
import { DEFAULT_SETTINGS } from "./settings.constants";
import type { CraftingSettings } from "./settings.types";
import { SettingsPanel } from "./SettingsPanel";
import { FIRST_TREE_ID, NO_SPECIALIZATIONS } from "./specializations.constants";
import type { SpecializationProfile } from "./specializations.types";
import { SpecializationsPanel } from "./SpecializationsPanel";
import { useBestCrafts } from "./useBestCrafts";
import { useManualPrices } from "./useManualPrices";
import { useSavedSetting } from "./useSavedSetting";

const NO_MISSING_PRICES: readonly MissingPrice[] = [];

type PageKind = "home" | "plan" | "help" | "privacy";

export function App({
  marketData,
  settingsStore,
  manualPriceStore,
  savedFilters,
  savedRoute,
  savedSettings,
  savedSpecializations,
  savedPlan,
  savedManualPrices,
}: {
  marketData: MarketData;
  settingsStore: SettingsStore;
  manualPriceStore: ManualPriceStore;
  savedFilters: Filters | undefined;
  savedRoute: RouteChoice | undefined;
  savedSettings: CraftingSettings | undefined;
  savedSpecializations: SpecializationProfile | undefined;
  savedPlan: CraftingPlan | undefined;
  savedManualPrices: readonly ManualPrice[];
}) {
  const [page, setPage] = useState<{
    kind: PageKind;
    section?: string;
  }>(() => pageFromHash(window.location.hash));
  useEffect(() => {
    const updatePage = () => {
      setPage(pageFromHash(window.location.hash));
    };
    window.addEventListener("hashchange", updatePage);
    return () => {
      window.removeEventListener("hashchange", updatePage);
    };
  }, []);
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
  const [specializations, setSpecializations] = useSavedSetting(
    settingsStore,
    SPECIALIZATIONS_SETTING,
    () => savedSpecializations ?? NO_SPECIALIZATIONS,
  );
  const [plan, setPlan] = useSavedSetting(
    settingsStore,
    PLAN_SETTING,
    () => savedPlan ?? NO_PLAN,
  );
  const [specializationsShown, setSpecializationsShown] = useState({
    open: false,
    treeId: FIRST_TREE_ID,
  });
  const showSpecializations = (treeId: string) => {
    setSpecializationsShown({ open: true, treeId });
  };
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
    specializations,
  );

  const [shownItemId, setShownItemId] = useState(() =>
    shownItemFromSearch(window.location.search),
  );
  // A craft the route no longer has closes, so the link doesn't keep it. An
  // error still lists every craft the route has.
  if (
    shownItemId !== undefined &&
    (bestCrafts.status === "error" ||
      (bestCrafts.status === "ready" && !bestCrafts.updating)) &&
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

  // Filling from focus ranks the crafts by their focus, once they're priced.
  const fillUnavailable = !settings.focus
    ? "Turn on Focus in Settings first"
    : bestCrafts.status === "loading"
      ? "Prices are still loading"
      : undefined;

  if (page.kind === "help" || page.kind === "privacy") {
    return (
      <div className={styles.app}>
        <LegalPage
          page={page.kind}
          {...(page.section === undefined ? {} : { helpSection: page.section })}
          onHome={() => {
            window.location.hash = "home";
          }}
        />
      </div>
    );
  }

  return (
    <div className={styles.app}>
      <header className={styles.masthead}>
        <h1 className={styles.title}>Albion Crafting</h1>
        <nav className={styles.pages} aria-label="Pages">
          <a
            href="#home"
            aria-current={page.kind === "home" ? "page" : undefined}
          >
            Best crafts
          </a>
          <a
            href="#plan"
            aria-current={page.kind === "plan" ? "page" : undefined}
          >
            Plan
          </a>
        </nav>
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
          <SpecializationsPanel
            profile={specializations}
            onChange={setSpecializations}
            open={specializationsShown.open}
            treeId={specializationsShown.treeId}
            onShow={showSpecializations}
            onClose={() => {
              setSpecializationsShown({
                ...specializationsShown,
                open: false,
              });
            }}
          />
          <SettingsPanel
            settings={settings}
            onChange={setSettings}
            onClearCache={() => marketData.clear()}
          />
        </div>
      </header>
      <main className={styles.main}>
        {page.kind === "plan" ? (
          <PlanPage
            marketData={marketData}
            plan={plan}
            onChange={setPlan}
            route={routeChoice}
            settings={settings}
            manualPrices={manualPrices}
            specializations={specializations}
            onFill={(budget) => {
              const crafts =
                bestCrafts.status === "loading" ? [] : bestCrafts.crafts;
              setPlan(
                (current) =>
                  fillPlan(current, routeChoice, crafts, budget, settings).plan,
              );
              return fillPlan(plan, routeChoice, crafts, budget, settings)
                .added;
            }}
            {...(fillUnavailable !== undefined && { fillUnavailable })}
          />
        ) : (
          <>
            <CraftingLocationBar
              route={routeChoice}
              onChange={setRouteChoice}
            />
            <BestCrafts
              bestCrafts={bestCrafts}
              shownItemId={shownItemId}
              onShowItem={setShownItemId}
              route={route}
              settings={settings}
              filters={filters}
              onFiltersChange={setFilters}
              persistent={settingsStore.persistent}
              pricesPersistent={marketData.persistent}
              manualPrices={manualPrices}
              onSaveManualPrice={saveManualPrice}
              onRemoveManualPrice={removeManualPrice}
              specializations={specializations}
              onEditSpecializations={showSpecializations}
              onAddToPlan={(itemId, alternative, quantity) => {
                setPlan((current) =>
                  addToPlan(
                    current,
                    routeChoice,
                    newEntry(itemId, alternative, quantity, settings),
                  ),
                );
              }}
            />
          </>
        )}
      </main>
      <Footer
        onHelp={() => {
          setPage({ kind: "help" });
          window.location.hash = "help";
        }}
      />
    </div>
  );
}

function pageFromHash(hash: string): {
  kind: PageKind;
  section?: string;
} {
  if (hash === "#plan") {
    return { kind: "plan" };
  }
  if (hash.startsWith("#help")) {
    const section = hash.slice("#help/".length);
    return { kind: "help", ...(section ? { section } : {}) };
  }
  if (hash === "#privacy") {
    return { kind: "privacy" };
  }
  return { kind: "home" };
}
