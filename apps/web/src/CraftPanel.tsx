import { type ReactNode, useId } from "react";

import type { MaterialLine, OrderPrices } from "@aoc/core";
import { type GameRecipe, itemName } from "@aoc/crafting-data";
import type { Region } from "@aoc/market-prices";

import type { Craft, CraftAlternative, UsedPrice } from "./best-crafts.types";
import styles from "./CraftPanel.module.css";
import {
  formatAgo,
  formatCount,
  formatPercent,
  formatQuantity,
  formatSilver,
  formatSilverPerFocus,
} from "./format.helpers";
import { sameManualPrice } from "./manual-prices.helpers";
import type { ManualPrice, ManualPriceKey } from "./manual-prices.types";
import { PriceBadge } from "./PriceBadge";
import { PriceRow } from "./PriceRow";
import { QUALITY } from "./prices.constants";
import { SidePanel } from "./SidePanel";

const MISSING: UsedPrice = { status: "missing", origin: "api" };

function seen(price: UsedPrice) {
  if (price.status === "missing") {
    return "missing";
  }
  const how = price.origin === "manual" ? "typed" : "seen";
  return `${how} ${formatAgo(price.ageMinutes)}${price.status === "stale" ? ", stale" : ""}`;
}

// How many the returns leave you buying, times what each costs.
function lineDetail(line: MaterialLine) {
  const used = formatQuantity(line.effectiveCount);
  const cost =
    line.status === "missing"
      ? `${used} × —`
      : `${used} × ${formatQuantity(line.unitPrice)} = ${formatSilver(line.cost)}`;
  return line.returnable ? cost : `Not returned · ${cost}`;
}

function amountCrafted(recipe: GameRecipe, alternative: number) {
  return (
    (alternative === 0 ? recipe : recipe.alternatives[alternative - 1])
      ?.amountCrafted ?? recipe.amountCrafted
  );
}

function sum(values: readonly (number | undefined)[]) {
  let total = 0;
  for (const value of values) {
    if (value === undefined) {
      return undefined;
    }
    total += value;
  }
  return total;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const titleId = useId();
  return (
    <section className={styles.section} aria-labelledby={titleId}>
      <h3 id={titleId} className={styles.title}>
        {title}
      </h3>
      {children}
    </section>
  );
}

function Figure({
  label,
  value,
  format = formatSilver,
  total = false,
}: {
  label: string;
  value: number | undefined;
  format?: (value: number) => string;
  total?: boolean;
}) {
  return (
    <div className={styles.figure} data-total={total}>
      <dt>{label}</dt>
      <dd data-loss={total && value !== undefined && value < 0}>
        {value === undefined ? "—" : format(value)}
      </dd>
    </div>
  );
}

export function CraftPanel({
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
  function priceRow(
    itemId: string,
    marketId: string,
    source: keyof OrderPrices,
    price: UsedPrice,
    { count, detail }: { count?: number; detail?: ReactNode } = {},
  ) {
    const key: ManualPriceKey = {
      region,
      itemId,
      marketId,
      quality: QUALITY,
      source,
    };
    const manual = manualPrices.find((typed) => sameManualPrice(typed, key));
    return (
      <PriceRow
        key={`${itemId} ${source}`}
        priceKey={key}
        count={count}
        manual={manual}
        placeholder={
          manual === undefined && price.status !== "missing"
            ? formatSilver(price.value)
            : undefined
        }
        status={<PriceBadge price={price}>{seen(price)}</PriceBadge>}
        detail={detail}
        missing={price.status === "missing"}
        onSave={onSave}
        onRemove={onRemove}
      />
    );
  }

  function breakdown(shown: CraftAlternative, recipe: GameRecipe) {
    const { materialCost, revenue } = shown;
    const materials =
      materialCost.status === "complete" ? materialCost.total : undefined;
    const spent = sum([materials, shown.stationFee, shown.silverCost]);
    const madeAtOnce = amountCrafted(recipe, shown.alternative);
    const sold = revenue.status === "missing" ? undefined : revenue;
    const result = shown.status === "complete" ? shown : undefined;
    return (
      <>
        <Section title="Materials">
          <ul className={styles.lines}>
            {materialCost.lines.map((line) =>
              priceRow(
                line.itemId,
                buyMarketId,
                line.source,
                shown.materialPrices.get(line.itemId) ?? MISSING,
                { count: line.count, detail: lineDetail(line) },
              ),
            )}
          </ul>
        </Section>
        <Section title="Costs">
          <dl className={styles.figures}>
            <Figure label="Materials" value={materials} />
            <Figure label="Station fee" value={shown.stationFee} />
            <Figure label="Silver" value={shown.silverCost} />
            <Figure label="Total" value={spent} total />
            {madeAtOnce > 1 && (
              <Figure
                label={`Each of ${formatCount(madeAtOnce)}`}
                value={spent === undefined ? undefined : spent / madeAtOnce}
              />
            )}
          </dl>
        </Section>
        <Section title="Revenue">
          <ul className={styles.lines}>
            {priceRow(
              shown.itemId,
              sellMarketId,
              revenue.source,
              shown.itemPrice,
            )}
          </ul>
          <dl className={styles.figures}>
            <Figure label="Tax" value={sold && -sold.tax} />
            <Figure label="Setup fee" value={sold && -sold.setupFee} />
            <Figure label="Net" value={sold?.net} total />
          </dl>
        </Section>
        <Section title="Result">
          <dl className={styles.figures}>
            <Figure label="Profit" value={result?.profit} total />
            <Figure
              label="Margin"
              value={result?.margin}
              format={formatPercent}
            />
            {shown.focusCost !== undefined && (
              <>
                <Figure
                  label="Focus"
                  value={shown.focusCost}
                  format={formatCount}
                />
                <Figure
                  label="Silver per focus"
                  value={result?.silverPerFocus}
                  format={formatSilverPerFocus}
                />
              </>
            )}
          </dl>
        </Section>
      </>
    );
  }

  return (
    <SidePanel
      heading={craft === undefined ? "" : itemName(craft.itemId)}
      closeLabel="Close details"
      open={craft !== undefined}
      onClose={onClose}
    >
      {craft !== undefined && breakdown(craft, craft.recipe)}
    </SidePanel>
  );
}
