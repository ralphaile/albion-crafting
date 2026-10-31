import { type ReactNode, useId, useState } from "react";

import type { OrderPrices } from "@aoc/core";
import { itemName } from "@aoc/crafting-data";
import { markets } from "@aoc/market-prices";

import { ItemIcon } from "./ItemIcon";
import type { ManualPrice, ManualPriceKey } from "./manual-prices.types";
import styles from "./PriceRow.module.css";

const ORDER_LABELS: Record<keyof OrderPrices, string> = {
  sellMin: "Sell order",
  buyMax: "Buy order",
};

const WHOLE_NUMBER = /^\d+$/;

function marketName(id: string) {
  return markets.find((market) => market.id === id)?.name ?? id;
}

function parseSilver(text: string) {
  const silver = Number(text);
  return WHOLE_NUMBER.test(text) && silver > 0 && Number.isSafeInteger(silver)
    ? silver
    : undefined;
}

export function PriceRow({
  priceKey,
  count,
  manual,
  placeholder,
  status,
  detail,
  missing,
  onSave,
  onRemove,
  onEntered,
}: {
  priceKey: ManualPriceKey;
  count?: number | undefined;
  manual: ManualPrice | undefined;
  placeholder?: string | undefined;
  status: ReactNode;
  detail?: ReactNode;
  missing: boolean;
  onSave: (price: ManualPrice) => void;
  onRemove: (key: ManualPriceKey) => void;
  // After Enter saved or removed the price.
  onEntered?: () => void;
}) {
  const statusId = useId();
  const errorId = useId();
  const saved = manual === undefined ? "" : String(manual.value);
  const [draft, setDraft] = useState({ text: saved, saved, invalid: false });
  if (draft.saved !== saved) {
    setDraft({ text: saved, saved, invalid: false });
  }
  const name = itemName(priceKey.itemId);
  const order = ORDER_LABELS[priceKey.source];
  const market = marketName(priceKey.marketId);

  function commit() {
    const text = draft.text.trim();
    if (text === saved) {
      return false;
    }
    if (text === "") {
      onRemove(priceKey);
      return true;
    }
    const value = parseSilver(text);
    if (value === undefined) {
      setDraft({ ...draft, invalid: true });
      return false;
    }
    onSave({ ...priceKey, value, enteredAt: Date.now() });
    return true;
  }

  return (
    <li className={styles.line}>
      <ItemIcon id={priceKey.itemId} />
      <span className={styles.name}>
        {name}
        {count !== undefined && <span className={styles.count}> ×{count}</span>}
      </span>
      <input
        className={styles.input}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        value={draft.text}
        aria-label={`${name}, ${order.toLowerCase()} in ${market}`}
        aria-invalid={draft.invalid}
        aria-describedby={draft.invalid ? `${statusId} ${errorId}` : statusId}
        onChange={(event) => {
          setDraft({ text: event.target.value, saved, invalid: false });
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            if (commit()) {
              onEntered?.();
            }
          } else if (event.key === "Escape" && draft.text !== saved) {
            // Cancels the typing; a second Escape closes the panel.
            event.preventDefault();
            setDraft({ text: saved, saved, invalid: false });
          }
        }}
        onBlur={commit}
      />
      <span id={statusId} className={styles.status} data-missing={missing}>
        {order} · {market} · {status}
      </span>
      {detail !== undefined && <span className={styles.detail}>{detail}</span>}
      {draft.invalid && (
        <p id={errorId} className={styles.error}>
          Whole silver above 0, like 1500
        </p>
      )}
    </li>
  );
}
