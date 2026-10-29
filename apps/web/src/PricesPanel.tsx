import { useId, useState } from "react";

import type { OrderPrices } from "@aoc/core";
import { itemName } from "@aoc/crafting-data";
import { markets, type Region } from "@aoc/market-prices";

import type { Craft, UsedPrice } from "./best-crafts.types";
import { formatAge, formatSilver } from "./format.helpers";
import { ItemIcon } from "./ItemIcon";
import { sameManualPrice } from "./manual-prices.helpers";
import type { ManualPrice, ManualPriceKey } from "./manual-prices.types";
import { QUALITY } from "./prices.constants";
import styles from "./PricesPanel.module.css";
import { SidePanel } from "./SidePanel";

const MISSING: UsedPrice = { status: "missing", origin: "api" };

const ORDER_LABELS: Record<keyof OrderPrices, string> = {
  sellMin: "Sell order",
  buyMax: "Buy order",
};

const WHOLE_NUMBER = /^\d+$/;

interface PriceLine {
  key: ManualPriceKey;
  count?: number;
  price: UsedPrice;
}

function marketName(id: string) {
  return markets.find((market) => market.id === id)?.name ?? id;
}

function parseSilver(text: string) {
  const silver = Number(text);
  return WHOLE_NUMBER.test(text) && silver > 0 && Number.isSafeInteger(silver)
    ? silver
    : undefined;
}

function ago(minutes: number) {
  return minutes < 1 ? "just now" : `${formatAge(minutes)} ago`;
}

function seen(price: UsedPrice) {
  if (price.status === "missing") {
    return "missing";
  }
  const how = price.origin === "manual" ? "typed" : "seen";
  return `${how} ${ago(price.ageMinutes)}${price.status === "stale" ? ", stale" : ""}`;
}

function priceLines(
  craft: Craft,
  region: Region,
  buyMarketId: string,
  sellMarketId: string,
): PriceLine[] {
  const key = (
    itemId: string,
    marketId: string,
    source: keyof OrderPrices,
  ): ManualPriceKey => ({ region, itemId, marketId, quality: QUALITY, source });
  return [
    {
      key: key(craft.itemId, sellMarketId, craft.revenue.source),
      price: craft.itemPrice,
    },
    ...craft.materialCost.lines.map((line) => ({
      key: key(line.itemId, buyMarketId, line.source),
      count: line.count,
      price: craft.materialPrices.get(line.itemId) ?? MISSING,
    })),
  ];
}

function PriceRow({
  line: { key, count, price },
  manual,
  onSave,
  onRemove,
}: {
  line: PriceLine;
  manual: ManualPrice | undefined;
  onSave: (price: ManualPrice) => void;
  onRemove: (key: ManualPriceKey) => void;
}) {
  const statusId = useId();
  const errorId = useId();
  const saved = manual === undefined ? "" : String(manual.value);
  const [draft, setDraft] = useState({ text: saved, saved, invalid: false });
  if (draft.saved !== saved) {
    setDraft({ text: saved, saved, invalid: false });
  }
  const name = itemName(key.itemId);
  const order = ORDER_LABELS[key.source];
  const market = marketName(key.marketId);

  function commit() {
    const text = draft.text.trim();
    if (text === saved) {
      return;
    }
    if (text === "") {
      onRemove(key);
      return;
    }
    const value = parseSilver(text);
    if (value === undefined) {
      setDraft({ ...draft, invalid: true });
      return;
    }
    onSave({ ...key, value, enteredAt: Date.now() });
  }

  return (
    <li className={styles.line}>
      <ItemIcon id={key.itemId} />
      <span className={styles.name}>
        {name}
        {count !== undefined && <span className={styles.count}> ×{count}</span>}
      </span>
      <input
        className={styles.input}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={
          manual === undefined && price.status !== "missing"
            ? formatSilver(price.value)
            : undefined
        }
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
            commit();
          } else if (event.key === "Escape" && draft.text !== saved) {
            // Cancels the typing; a second Escape closes the panel.
            event.preventDefault();
            setDraft({ text: saved, saved, invalid: false });
          }
        }}
        onBlur={commit}
      />
      <span id={statusId} className={styles.status} data-price={price.status}>
        {order} · {market} · {seen(price)}
      </span>
      {draft.invalid && (
        <p id={errorId} className={styles.error}>
          Whole silver above 0, like 1500
        </p>
      )}
    </li>
  );
}

export function PricesPanel({
  craft,
  region,
  buyMarketId,
  sellMarketId,
  manualPrices,
  onSave,
  onRemove,
  onClose,
}: {
  craft: Craft | undefined;
  region: Region;
  buyMarketId: string;
  sellMarketId: string;
  manualPrices: readonly ManualPrice[];
  onSave: (price: ManualPrice) => void;
  onRemove: (key: ManualPriceKey) => void;
  onClose: () => void;
}) {
  return (
    <SidePanel
      heading={craft === undefined ? "" : itemName(craft.itemId)}
      closeLabel="Close prices"
      open={craft !== undefined}
      onClose={onClose}
    >
      {craft !== undefined && (
        <ul className={styles.lines}>
          {priceLines(craft, region, buyMarketId, sellMarketId).map((line) => (
            <PriceRow
              key={`${line.key.itemId} ${line.key.source}`}
              line={line}
              manual={manualPrices.find((price) =>
                sameManualPrice(price, line.key),
              )}
              onSave={onSave}
              onRemove={onRemove}
            />
          ))}
        </ul>
      )}
    </SidePanel>
  );
}
