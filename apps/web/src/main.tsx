import "@fontsource/alegreya/latin-700.css";
import "@fontsource/alegreya-sans/latin-400.css";
import "@fontsource/alegreya-sans/latin-500.css";
import "@fontsource/alegreya-sans/latin-700.css";
import "@fontsource/alegreya-sans-sc/latin-500.css";
import "@fontsource/alegreya-sans-sc/latin-700.css";
import "./theme.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { openMarketData } from "@aoc/market-prices";

import { App } from "./App";
import { openManualPriceStore } from "./manual-prices.store";
import {
  CRAFTING_SETTING,
  FILTERS_SETTING,
  ROUTE_SETTING,
} from "./saved-settings.constants";
import { openSettingsStore } from "./saved-settings.store";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root element in index.html");
}

const [marketData, settingsStore, manualPriceStore] = await Promise.all([
  openMarketData(),
  openSettingsStore(),
  openManualPriceStore(),
]);
// Loaded before the first render, so the first price request is already for
// the saved route, filters and settings, and is priced with the manual prices.
const [savedFilters, savedRoute, savedSettings, savedManualPrices] =
  await Promise.all([
    settingsStore.load(FILTERS_SETTING),
    settingsStore.load(ROUTE_SETTING),
    settingsStore.load(CRAFTING_SETTING),
    manualPriceStore.list(),
  ]);

createRoot(root).render(
  <StrictMode>
    <App
      marketData={marketData}
      settingsStore={settingsStore}
      savedFilters={savedFilters}
      savedRoute={savedRoute}
      savedSettings={savedSettings}
      savedManualPrices={savedManualPrices}
    />
  </StrictMode>,
);
