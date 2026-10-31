import styles from "./LegalPages.module.css";

const AODP_URL = "https://www.albion-online-data.com/";
const AODP_GITHUB_URL = "https://github.com/ao-data/albion-online-data";
const AODP_TERMS_URL = "https://www.albion-online-data.com/#is-this-allowed";
const DUMPS_URL = "https://github.com/ao-data/ao-bin-dumps";
const RENDER_URL = "https://render.albiononline.com/v1/item/T4_MAIN_SWORD.png";

export function LegalPage({
  page,
  onHome,
}: {
  page: "help" | "privacy";
  onHome: () => void;
}) {
  return (
    <div className={styles.page}>
      <a className={styles.back} href="#home" onClick={onHome}>
        ← Back to Albion Crafting
      </a>
      {page === "help" ? <HelpContent /> : <PrivacyContent />}
      <Footer />
    </div>
  );
}

function HelpContent() {
  return (
    <article className={styles.content}>
      <h1>Help and about</h1>
      <p>
        Albion Crafting compares crafting returns for a route you choose. It
        uses live market prices where available and lets you enter missing
        prices yourself.
      </p>
      <h2>Data and attribution</h2>
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
        This is a fan-made site. It is not affiliated with or endorsed by
        Sandbox Interactive. Albion Online and its names, logos, and assets
        belong to their respective owners.
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

export function Footer() {
  return (
    <footer className={styles.footer}>
      <span className={styles.disclaimer}>
        Fan site, not affiliated with or endorsed by Sandbox Interactive.
      </span>
      <a href="#help">Help and attribution</a>
      <a href="#privacy">Privacy policy</a>
    </footer>
  );
}
