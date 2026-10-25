import { useState } from "react";

import { itemName, searchItems } from "@aoc/crafting-data";

import { ItemIcon } from "./ItemIcon";

const MAX_RESULTS = 50;

export function ItemSearch() {
  const [query, setQuery] = useState("");
  const matches = searchItems(query);

  return (
    <section>
      <label>
        Search items{" "}
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
        />
      </label>
      {query.trim() !== "" && matches.length === 0 && (
        <p>No items match “{query.trim()}”.</p>
      )}
      {matches.length > MAX_RESULTS && (
        <p>
          Showing the first {MAX_RESULTS} of {matches.length} matches. Type more
          to narrow them down.
        </p>
      )}
      {matches.length > 0 && (
        <ul aria-label="Matching items">
          {matches.slice(0, MAX_RESULTS).map((id) => (
            <li key={id}>
              <ItemIcon id={id} /> {itemName(id)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
