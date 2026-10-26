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

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root element in index.html");
}

const marketData = await openMarketData();

createRoot(root).render(
  <StrictMode>
    <App marketData={marketData} />
  </StrictMode>,
);
