import { useState } from "react";

import { itemName, searchItems } from "@aoc/crafting-data";

import { ItemIcon } from "./ItemIcon";
import styles from "./ItemSearch.module.css";

const MAX_RESULTS = 50;

export function ItemSearch() {
  const [query, setQuery] = useState("");
  const matches = searchItems(query);

  return (
    <section className={styles.search}>
      <label className={styles.label}>
        Search items{" "}
        <input
          className={styles.input}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
        />
      </label>
      {query.trim() !== "" && matches.length === 0 && (
        <p className={styles.note}>No items match “{query.trim()}”.</p>
      )}
      {matches.length > MAX_RESULTS && (
        <p className={styles.note}>
          Showing the first {MAX_RESULTS} of {matches.length} matches. Type more
          to narrow them down.
        </p>
      )}
      {matches.length > 0 && (
        <ul className={styles.results} aria-label="Matching items">
          {matches.slice(0, MAX_RESULTS).map((id) => (
            <li key={id} className={styles.result}>
              <ItemIcon id={id} /> {itemName(id)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
