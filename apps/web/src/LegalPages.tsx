import { useEffect } from "react";

import styles from "./LegalPages.module.css";

const AODP_URL = "https://www.albion-online-data.com/";
const AODP_GITHUB_URL = "https://github.com/ao-data/albion-online-data";
const AODP_TERMS_URL = "https://www.albion-online-data.com/#is-this-allowed";
const DUMPS_URL = "https://github.com/ao-data/ao-bin-dumps";
const RENDER_URL = "https://render.albiononline.com/v1/item/T4_MAIN_SWORD.png";

export function LegalPage({
  page,
  onHome,
  helpSection,
}: {
  page: "help" | "privacy";
  onHome: () => void;
  helpSection?: string;
}) {
  useEffect(() => {
    if (page === "help" && helpSection !== undefined) {
      document.getElementById(helpSection)?.scrollIntoView({
        block: "start",
      });
    }
  }, [helpSection, page]);

  return (
    <div className={styles.page}>
      <a className={styles.back} href="#home" onClick={onHome}>
        ← Back to Albion Crafting
      </a>
      {page === "help" ? (
        <HelpContent section={helpSection} />
      ) : (
        <PrivacyContent />
      )}
      <Footer
        onHelp={() => {
          window.location.hash = "help";
        }}
      />
    </div>
  );
}

const GLOSSARY = [
  [
    "rrr",
    "RRR (return rate)",
    "The share of materials returned on average. A higher production bonus gives a higher RRR, lowering material cost.",
  ],
  [
    "production-bonus",
    "Production bonus",
    "The location, specialty, daily bonus and focus bonuses that determine the return rate.",
  ],
  [
    "focus",
    "Focus",
    "A resource spent to increase production bonus. Silver per focus compares the extra profit with and without focus.",
  ],
  [
    "fce",
    "FCE",
    "Focus cost efficiency from your specialization levels. Every 10,000 FCE halves a craft’s focus cost.",
  ],
  [
    "station-fee",
    "Station fee",
    "The silver charged per 100 nutrition by the crafting station owner. Your own island can cost 0.",
  ],
  [
    "sell-orders",
    "Sell order vs instant sell",
    "A sell order lists at the lowest sell order and adds a setup fee. Instant sell takes the highest buy order immediately. The Black Market is always instant.",
  ],
  [
    "black-market",
    "Black Market",
    "Caerleon’s NPC market that buys gear to stock game loot. It uses its highest buy order.",
  ],
  [
    "map-quality",
    "Map quality",
    "A hideout map quality from Q1 to Q6 that adds a production bonus for the biome’s specialties.",
  ],
  [
    "power-level",
    "Power level",
    "A hideout level from 1 to 9 that adds general and biome-specialist production bonuses.",
  ],
  [
    "artifact",
    "Artifact",
    "A special material used by some recipes. It is not returned by crafting and can sometimes be replaced by a token.",
  ],
] as const;

function HelpContent({ section }: { section: string | undefined }) {
  return (
    <article className={styles.content}>
      <h1>Help and about</h1>
      <p>
        Albion Crafting compares crafting returns for a route you choose. It
        uses live market prices where available and lets you enter missing
        prices yourself.
      </p>
      <h2 id="data">Data and disclaimers</h2>
      <p>
        Prices are crowdsourced by AODP and may be stale, incomplete or wrong.
        Results are estimates, not guarantees. For better prices, install the{" "}
        <a href={AODP_URL} rel="noreferrer">
          Albion Data Client
        </a>{" "}
        and browse the markets you need in game.
      </p>
      <p>
        This is a fan-made site. It is not affiliated with or endorsed by
        Sandbox Interactive.
      </p>
      <h2 id="glossary">Glossary</h2>
      <dl className={styles.glossary}>
        {GLOSSARY.map(([id, term, definition]) => (
          <div key={id} id={id} className={styles.definition}>
            <dt>{term}</dt>
            <dd>{definition}</dd>
          </div>
        ))}
      </dl>
      <h2 id="formulas">How profit is calculated</h2>
      <p>
        Profit is net revenue minus material cost, station fee and recipe
        silver. Revenue subtracts market tax and any sell-order setup fee.
        Return rate reduces the expected quantity of returnable materials;
        artifacts and tokens are counted in full.
      </p>
      <p>
        See the detailed{" "}
        <a href="https://github.com/ralphaile/albion-crafting/blob/main/docs/glossary.md#material-cost">
          material-cost formulas
        </a>{" "}
        and the{" "}
        <a href="https://github.com/ralphaile/albion-crafting/blob/main/packages/core/src/evaluate.helpers.ts">
          calculation source
        </a>
        .
      </p>
      <h2 id="price-badges">Price badges</h2>
      <ul>
        <li>
          <strong>API fresh:</strong> AODP saw the price within the freshness
          setting.
        </li>
        <li>
          <strong>API stale:</strong> AODP has a price, but it is older than
          that setting.
        </li>
        <li>
          <strong>Manual:</strong> you entered the price yourself.
        </li>
        <li>
          <strong>Missing:</strong> no usable price is available.
        </li>
      </ul>
      {section !== undefined && (
        <p className={styles.highlight}>
          You opened this page for{" "}
          <a href={`#help/${section}`}>
            the {section.replaceAll("-", " ")} explanation
          </a>
          .
        </p>
      )}
      <h2 id="attribution">Data and attribution</h2>
      <ul>
        <li>
          Market prices are provided by the{" "}
          <a href={AODP_URL} rel="noreferrer">
            Albion Online Data Project (AODP)
          </a>
          . See its{" "}
          <a href={AODP_GITHUB_URL} rel="noreferrer">
            source
          </a>{" "}
          and{" "}
          <a href={AODP_TERMS_URL} rel="noreferrer">
            terms of use
          </a>
          .
        </li>
        <li>
          Recipes and game data come from{" "}
          <a href={DUMPS_URL} rel="noreferrer">
            ao-bin-dumps
          </a>
          . The repository does not publish a separate licence file; this
          project credits it as a data source and links to its repository for
          its current terms and notices.
        </li>
        <li>
          Item icons are requested from Albion Online&apos;s official{" "}
          <a href={RENDER_URL} rel="noreferrer">
            render service
          </a>
          , in line with that service&apos;s terms.
        </li>
      </ul>
      <p>
        Albion Online and its names, logos, and assets belong to their
        respective owners.
      </p>
      <p>
        See the <a href="#privacy">privacy policy</a> for storage and deletion
        information.
      </p>
    </article>
  );
}

function PrivacyContent() {
  return (
    <article className={styles.content}>
      <h1>Privacy policy</h1>
      <p>Last updated: October 31, 2026</p>
      <h2>What is stored locally</h2>
      <p>
        The site stores settings, filters, route choices, specializations,
        manually entered prices, and cached market prices in this browser&apos;s
        local storage or IndexedDB. This data is used only to make the tool work
        on this device.
      </p>
      <h2>Accounts and server storage</h2>
      <p>
        Albion Crafting currently has no accounts and no application server, so
        it does not store account data or saved crafting data on a server. If
        accounts are introduced, the account identifier and the saved data
        needed to provide that account feature will be stored on the service;
        this policy will be updated before that happens.
      </p>
      <h2>How to delete your data</h2>
      <p>
        To delete local data, clear this site&apos;s browser data (including
        IndexedDB and local storage) in your browser settings. Any server data
        will be deletable from the account settings or by contacting the service
        at the time accounts are introduced.
      </p>
      <p>
        The app may request prices and item images from the linked AODP and
        official render services. Those requests are subject to their own
        privacy policies and terms.
      </p>
    </article>
  );
}

export function Footer({ onHelp }: { onHelp?: () => void }) {
  return (
    <footer className={styles.footer}>
      <span className={styles.disclaimer}>
        Fan site, not affiliated with or endorsed by Sandbox Interactive.
      </span>
      <a
        href="#help"
        onClick={() => {
          onHelp?.();
        }}
      >
        Help and attribution
      </a>
      <a href="#privacy">Privacy policy</a>
    </footer>
  );
}
