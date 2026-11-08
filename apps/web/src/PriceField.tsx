import type { Region } from "@aoc/market-prices";

import { formatSilver } from "./format.helpers";
import { sameManualPrice } from "./manual-prices.helpers";
import type { ManualPrice, ManualPriceKey } from "./manual-prices.types";
import styles from "./PriceField.module.css";
import { usePriceDraft } from "./usePriceDraft";

// What a page needs to type prices, which are saved as typed prices for every
// page.
export interface PriceTyping {
  region: Region;
  manualPrices: readonly ManualPrice[];
  onSave: (price: ManualPrice) => void;
  onRemove: (key: ManualPriceKey) => void;
}

// A price you can type over. Until you do, it shows `price`, the one in use.
export function PriceField({
  label,
  priceKey,
  price,
  typing,
}: {
  label: string;
  priceKey: ManualPriceKey;
  price: number | undefined;
  typing: PriceTyping;
}) {
  const manual = typing.manualPrices.find((typed) =>
    sameManualPrice(typed, priceKey),
  );
  const { invalid, inputProps } = usePriceDraft({
    priceKey,
    manual,
    onSave: typing.onSave,
    onRemove: typing.onRemove,
  });
  return (
    <input
      {...inputProps}
      className={styles.price}
      data-missing={price === undefined}
      aria-label={label}
      title={invalid ? "Whole silver above 0, like 1500" : undefined}
      placeholder={
        manual === undefined && price !== undefined
          ? formatSilver(price)
          : "Silver"
      }
    />
  );
}
