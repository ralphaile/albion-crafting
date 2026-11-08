import { type ReactNode, useId } from "react";

import type { OrderPrices } from "@aoc/core";
import { itemName } from "@aoc/crafting-data";
import { markets } from "@aoc/market-prices";

import { ItemIcon } from "./ItemIcon";
import type { ManualPrice, ManualPriceKey } from "./manual-prices.types";
import styles from "./PriceRow.module.css";
import { usePriceDraft } from "./usePriceDraft";

const ORDER_LABELS: Record<keyof OrderPrices, string> = {
  sellMin: "Sell order",
  buyMax: "Buy order",
};

function marketName(id: string) {
  return markets.find((market) => market.id === id)?.name ?? id;
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
  const { invalid, inputProps } = usePriceDraft({
    priceKey,
    manual,
    onSave,
    onRemove,
    onEntered,
  });
  const name = itemName(priceKey.itemId);
  // Shown as the table shows it: the name, then the tier in a chip.
  const tier = /^(.*) (\d)\.(\d)$/.exec(name);
  const order = ORDER_LABELS[priceKey.source];
  const market = marketName(priceKey.marketId);

  return (
    <li className={styles.line}>
      <ItemIcon id={priceKey.itemId} />
      <span className={styles.name} title={name}>
        <span className={styles.nameText}>{tier?.[1] ?? name}</span>
        {tier !== null && (
          <span className={styles.tier} data-enchant={tier[3]}>
            {tier[2]}.{tier[3]}
          </span>
        )}
        {count !== undefined && <span className={styles.count}>×{count}</span>}
      </span>
      <input
        {...inputProps}
        className={styles.input}
        placeholder={placeholder ?? "Silver"}
        aria-label={`${name}, ${order.toLowerCase()} in ${market}`}
        aria-describedby={invalid ? `${statusId} ${errorId}` : statusId}
      />
      <span id={statusId} className={styles.status} data-missing={missing}>
        {order} · {market} · {status}
      </span>
      {detail !== undefined && <span className={styles.detail}>{detail}</span>}
      {invalid && (
        <p id={errorId} className={styles.error}>
          Whole silver above 0, like 1500
        </p>
      )}
    </li>
  );
}
