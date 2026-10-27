import type { MarketData } from "@aoc/market-prices";

import styles from "./App.module.css";
import { BestCrafts } from "./BestCrafts";
import { ItemSearch } from "./ItemSearch";
import { DEFAULT_ROUTE } from "./route";
import { DEFAULT_SETTINGS } from "./settings";

export function App({ marketData }: { marketData: MarketData }) {
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
        <ItemSearch />
        <BestCrafts
          marketData={marketData}
          route={DEFAULT_ROUTE}
          settings={DEFAULT_SETTINGS}
        />
      </main>
    </div>
  );
}
