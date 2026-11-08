import { useMemo, useState } from "react";

import type { MarketData } from "@aoc/market-prices";

import styles from "./BestCrafts.module.css";
import { CompareMarkets } from "./CompareMarkets";
import { CraftFilters, type UpdateFilters } from "./CraftFilters";
import { CraftPanel } from "./CraftPanel";
import { CraftsTable } from "./CraftsTable";
import { NO_FILTERS } from "./filters.constants";
import { activeFilters } from "./filters.helpers";
import type { Filters } from "./filters.types";
import type { ManualPrice, ManualPriceKey } from "./manual-prices.types";
import { NO_PINS } from "./material-pins.constants";
import type { MaterialPins, PinMaterialHandler } from "./material-pins.types";
import type { AddToPlanHandler } from "./plan.types";
import { PriceStatus } from "./PriceStatus";
import type { ChooseRecipeHandler } from "./recipe-choices.types";
import type { Route } from "./route.types";
import type { CraftingSettings } from "./settings.types";
import { NO_SPECIALIZATIONS } from "./specializations.constants";
import type { SpecializationProfile } from "./specializations.types";
import type { BestCraftsResult } from "./useBestCrafts";

const SKELETON_ROWS = 8;

const IGNORE_FILTERS: UpdateFilters = () => undefined;

const NO_MANUAL_PRICES: readonly ManualPrice[] = [];

const IGNORE_MANUAL_PRICE = () => undefined;

const IGNORE_EDIT_SPECIALIZATIONS = () => undefined;

const IGNORE_RECIPE_CHOICE = () => undefined;

export function BestCrafts({
  bestCrafts,
  shownItemId,
  onShowItem,
  route,
  settings,
  filters = NO_FILTERS,
  onFiltersChange = IGNORE_FILTERS,
  persistent = true,
  pricesPersistent = true,
  manualPrices = NO_MANUAL_PRICES,
  onSaveManualPrice = IGNORE_MANUAL_PRICE,
  onRemoveManualPrice = IGNORE_MANUAL_PRICE,
  specializations = NO_SPECIALIZATIONS,
  onEditSpecializations = IGNORE_EDIT_SPECIALIZATIONS,
  onChooseRecipe = IGNORE_RECIPE_CHOICE,
  pins = NO_PINS,
  onPinMaterial,
  onAddToPlan,
  sellMarkets,
}: {
  bestCrafts: BestCraftsResult;
  shownItemId: string | undefined;
  onShowItem: (itemId: string | undefined) => void;
  route: Route;
  settings: CraftingSettings;
  filters?: Filters;
  onFiltersChange?: UpdateFilters;
  persistent?: boolean;
  pricesPersistent?: boolean;
  manualPrices?: readonly ManualPrice[];
  onSaveManualPrice?: (price: ManualPrice) => void;
  onRemoveManualPrice?: (key: ManualPriceKey) => void;
  specializations?: SpecializationProfile;
  onEditSpecializations?: (treeId: string) => void;
  onChooseRecipe?: ChooseRecipeHandler;
  pins?: MaterialPins;
  onPinMaterial?: PinMaterialHandler;
  onAddToPlan?: AddToPlanHandler;
  // Without it, the craft panel doesn't compare sell markets.
  sellMarkets?: {
    marketData: MarketData;
    onSellIn: (marketId: string) => void;
  };
}) {
  const filtered = activeFilters(filters).length > 0;
  const crafts =
    bestCrafts.status === "loading" ? undefined : bestCrafts.crafts;
  const updating = bestCrafts.status === "ready" && bestCrafts.updating;
  // A new route, filter or setting starts the table at its first page again;
  // new prices don't.
  const listId = useMemo(
    () => ({ route, filters, settings }),
    [route, filters, settings],
  );
  const foundCraft =
    bestCrafts.status === "loading"
      ? undefined
      : bestCrafts.allCrafts.find(({ itemId }) => itemId === shownItemId);
  // Selling in another market from the panel reloads the table. The panel
  // keeps its craft meanwhile, rather than closing.
  const [lastCraft, setLastCraft] = useState(foundCraft);
  if (foundCraft !== undefined && foundCraft !== lastCraft) {
    setLastCraft(foundCraft);
  }
  const shownCraft =
    foundCraft ??
    (bestCrafts.status === "loading" && lastCraft?.itemId === shownItemId
      ? lastCraft
      : undefined);

  return (
    <div className={styles.bestCrafts}>
      <CraftFilters
        filters={filters}
        onChange={onFiltersChange}
        persistent={persistent}
      />
      <PriceStatus bestCrafts={bestCrafts} persistent={pricesPersistent} />
      {bestCrafts.status === "loading" && (
        <div className={styles.skeleton} aria-hidden="true">
          {Array.from({ length: SKELETON_ROWS }, (_, row) => (
            <div key={row} className={styles.skeletonRow} />
          ))}
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
      {crafts !== undefined &&
        (filtered && crafts.length === 0 && !updating ? (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>No crafts match your filters</p>
            <p>Loosen or remove a filter to see more.</p>
            <button
              type="button"
              className={styles.button}
              onClick={() => {
                onFiltersChange((current) => ({
                  ...NO_FILTERS,
                  mode: current.mode,
                }));
              }}
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <CraftsTable
            crafts={crafts}
            focus={settings.focus}
            lowVolumePerDay={settings.lowVolumePerDay}
            onShowCraft={onShowItem}
            {...(onAddToPlan && { onAddToPlan })}
            listId={listId}
            holdOrder={updating}
          />
        ))}
      <CraftPanel
        craft={shownCraft}
        region={settings.server}
        buyMarkets={{ ...route, pins }}
        {...(onPinMaterial && { onPin: onPinMaterial })}
        sellMarketId={route.sellMarketId}
        manualPrices={manualPrices}
        onSave={onSaveManualPrice}
        onRemove={onRemoveManualPrice}
        specializations={specializations}
        onEditSpecializations={onEditSpecializations}
        onChooseRecipe={onChooseRecipe}
        {...(onAddToPlan && { onAddToPlan })}
        {...(sellMarkets && {
          compareMarkets: (craft) => (
            <CompareMarkets
              craft={craft}
              marketData={sellMarkets.marketData}
              settings={settings}
              manualPrices={manualPrices}
              sellMarketId={route.sellMarketId}
              onSellIn={sellMarkets.onSellIn}
            />
          ),
        })}
        onClose={() => {
          onShowItem(undefined);
        }}
      />
    </div>
  );
}
