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
import { openFilterStore } from "./saved-filters";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root element in index.html");
}

const [marketData, filterStore] = await Promise.all([
  openMarketData(),
  openFilterStore(),
]);
// Loaded before the first render, so the first price request is already filtered.
const savedFilters = await filterStore.load();

createRoot(root).render(
  <StrictMode>
    <App
      marketData={marketData}
      filterStore={filterStore}
      savedFilters={savedFilters}
    />
  </StrictMode>,
);
