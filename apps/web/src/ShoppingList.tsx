import { useEffect, useState } from "react";

import { itemName } from "@aoc/crafting-data";

import { formatCount, formatSilver } from "./format.helpers";
import { shoppingListText } from "./shopping-list.helpers";
import type { ShoppingMarket } from "./shopping-list.types";
import styles from "./ShoppingList.module.css";

const COPIED_FOR_MS = 2000;

type CopyState = "idle" | "copied" | "failed";

const COPY_LABELS: Record<CopyState, string> = {
  idle: "Copy as text",
  copied: "Copied",
  failed: "Couldn’t copy",
};

export function ShoppingList({
  markets,
}: {
  markets: readonly ShoppingMarket[];
}) {
  const [copy, setCopy] = useState<CopyState>("idle");
  useEffect(() => {
    if (copy === "idle") {
      return;
    }
    const timer = setTimeout(() => {
      setCopy("idle");
    }, COPIED_FOR_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [copy]);

  if (markets.length === 0) {
    return null;
  }
  return (
    <section className={styles.shoppingList} aria-label="Shopping list">
      <div className={styles.head}>
        <h3>Shopping list</h3>
        <button
          type="button"
          aria-live="polite"
          onClick={() => {
            // A page served over plain http has no clipboard at all.
            Promise.resolve()
              .then(() =>
                navigator.clipboard.writeText(shoppingListText(markets)),
              )
              .then(
                () => {
                  setCopy("copied");
                },
                () => {
                  setCopy("failed");
                },
              );
          }}
        >
          {COPY_LABELS[copy]}
        </button>
      </div>
      {markets.map(({ marketId, lines, total, complete }) => (
        <table key={marketId} className={styles.market}>
          <caption>{marketId}</caption>
          <thead>
            <tr>
              <th scope="col">Item</th>
              <th scope="col">To buy</th>
              <th scope="col">Unit price</th>
              <th scope="col">Cost</th>
            </tr>
          </thead>
          <tbody>
            {lines.map(({ itemId, toBuy, unitPrice, cost }) => (
              <tr key={itemId}>
                <th scope="row">{itemName(itemId)}</th>
                <td>{formatCount(toBuy)}</td>
                <td>
                  {unitPrice === undefined ? (
                    <span className={styles.missing}>No price</span>
                  ) : (
                    formatSilver(unitPrice)
                  )}
                </td>
                <td>{cost === undefined ? "" : formatSilver(cost)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={3}>
                {complete ? "Total" : "Total of the items with a price"}
              </th>
              <td>{formatSilver(total)}</td>
            </tr>
          </tfoot>
        </table>
      ))}
    </section>
  );
}
