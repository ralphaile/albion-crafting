import { useCallback, useState } from "react";

import { sameManualPrice } from "./manual-prices.helpers";
import type {
  ManualPrice,
  ManualPriceKey,
  ManualPriceStore,
} from "./manual-prices.types";

// The prices apply as soon as they change; saving to the browser happens
// alongside.
export function useManualPrices(
  store: ManualPriceStore,
  initial: readonly ManualPrice[],
) {
  const [manualPrices, setManualPrices] = useState(initial);

  const saveManualPrice = useCallback(
    (price: ManualPrice) => {
      setManualPrices((current) => [
        ...current.filter((other) => !sameManualPrice(other, price)),
        price,
      ]);
      void store.save(price);
    },
    [store],
  );

  const removeManualPrice = useCallback(
    (key: ManualPriceKey) => {
      setManualPrices((current) =>
        current.filter((other) => !sameManualPrice(other, key)),
      );
      void store.remove(key);
    },
    [store],
  );

  return { manualPrices, saveManualPrice, removeManualPrice };
}
