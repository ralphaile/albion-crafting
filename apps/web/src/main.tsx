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
import { FILTERS_SETTING, ROUTE_SETTING } from "./saved-settings.constants";
import { openSettingsStore } from "./saved-settings.store";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root element in index.html");
}

const [marketData, settingsStore] = await Promise.all([
  openMarketData(),
  openSettingsStore(),
]);
// Loaded before the first render, so the first price request is already for
// the saved route and filters.
const [savedFilters, savedRoute] = await Promise.all([
  settingsStore.load(FILTERS_SETTING),
  settingsStore.load(ROUTE_SETTING),
]);

createRoot(root).render(
  <StrictMode>
    <App
      marketData={marketData}
      settingsStore={settingsStore}
      savedFilters={savedFilters}
      savedRoute={savedRoute}
    />
  </StrictMode>,
);
