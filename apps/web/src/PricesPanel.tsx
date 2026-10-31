import type { OrderPrices } from "@aoc/core";
import { itemName } from "@aoc/crafting-data";
import type { Region } from "@aoc/market-prices";

import type { Craft, UsedPrice } from "./best-crafts.types";
import { formatAgo, formatSilver } from "./format.helpers";
import { sameManualPrice } from "./manual-prices.helpers";
import type { ManualPrice, ManualPriceKey } from "./manual-prices.types";
import { PriceBadge } from "./PriceBadge";
import { PriceRow } from "./PriceRow";
import { QUALITY } from "./prices.constants";
import styles from "./PricesPanel.module.css";
import { SidePanel } from "./SidePanel";

const MISSING: UsedPrice = { status: "missing", origin: "api" };

interface PriceLine {
  key: ManualPriceKey;
  count?: number;
  price: UsedPrice;
}

function seen(price: UsedPrice) {
  if (price.status === "missing") {
    return "missing";
  }
  const how = price.origin === "manual" ? "typed" : "seen";
  return `${how} ${formatAgo(price.ageMinutes)}${price.status === "stale" ? ", stale" : ""}`;
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
          {priceLines(craft, region, buyMarketId, sellMarketId).map(
            ({ key, count, price }) => {
              const manual = manualPrices.find((typed) =>
                sameManualPrice(typed, key),
              );
              return (
                <PriceRow
                  key={`${key.itemId} ${key.source}`}
                  priceKey={key}
                  count={count}
                  manual={manual}
                  placeholder={
                    manual === undefined && price.status !== "missing"
                      ? formatSilver(price.value)
                      : undefined
                  }
                  status={<PriceBadge price={price}>{seen(price)}</PriceBadge>}
                  missing={price.status === "missing"}
                  onSave={onSave}
                  onRemove={onRemove}
                />
              );
            },
          )}
        </ul>
      )}
    </SidePanel>
  );
}
