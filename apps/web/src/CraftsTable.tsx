import { useWindowVirtualizer } from "@tanstack/react-virtual";
import {
  type CSSProperties,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { defaultSortKey, rank, type SortKey } from "@aoc/core";
import { itemName } from "@aoc/crafting-data";
import type { ObservedPrice } from "@aoc/market-prices";

import type { Craft } from "./best-crafts";
import styles from "./CraftsTable.module.css";
import {
  formatAge,
  formatCount,
  formatPercent,
  formatSilver,
  formatSilverPerFocus,
} from "./format";
import { ItemIcon } from "./ItemIcon";

const ROW_HEIGHT = 52;
const REVEALED_ROWS = 14;
const REVEAL_MS = 1000;

const SORT_LABELS: Record<SortKey, string> = {
  profit: "profit per craft",
  margin: "margin",
  silverPerFocus: "silver per focus",
};

type Line =
  { kind: "craft"; craft: Craft } | { kind: "divider"; count: number };

function cx(...names: (string | false | undefined)[]) {
  return names.filter(Boolean).join(" ");
}

function plural(count: number, one: string, many: string) {
  return `${formatCount(count)} ${count === 1 ? one : many}`;
}

function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => {
        list.removeEventListener("change", onChange);
      };
    },
    () => window.matchMedia(query).matches,
  );
}

// Where the rows start on the page, which moves when anything above them grows.
function useOffsetTop(ref: RefObject<HTMLElement | null>) {
  const [offsetTop, setOffsetTop] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (element === null) {
      return;
    }
    const observer = new ResizeObserver(() => {
      setOffsetTop(element.getBoundingClientRect().top + window.scrollY);
    });
    observer.observe(document.body);
    return () => {
      observer.disconnect();
    };
  }, [ref]);
  return offsetTop;
}

function useRevealing() {
  const [revealing, setRevealing] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => {
      setRevealing(false);
    }, REVEAL_MS);
    return () => {
      clearTimeout(timer);
    };
  }, []);
  return revealing;
}

function SortHeader({
  sortKey,
  label,
  active,
  onSort,
}: {
  sortKey: SortKey;
  label: string;
  active: SortKey;
  onSort: (sortKey: SortKey) => void;
}) {
  const sorted = sortKey === active;
  return (
    <th
      scope="col"
      className={cx(styles.number, sorted && styles.sorted)}
      aria-sort={sorted ? "descending" : undefined}
    >
      <button
        type="button"
        className={styles.sortButton}
        onClick={() => {
          onSort(sortKey);
        }}
      >
        {label}
        <svg className={styles.arrow} viewBox="0 0 10 6" aria-hidden="true">
          <path d="M1 1l4 4 4-4" />
        </svg>
      </button>
    </th>
  );
}

function PriceAge({
  label,
  price,
}: {
  label: string;
  price: ObservedPrice | undefined;
}) {
  if (price === undefined || price.status === "missing") {
    return null;
  }
  const age = formatAge(price.ageMinutes);
  return (
    <span
      className={styles.age}
      data-status={price.status}
      title={`${label} price seen ${age} ago${price.status === "stale" ? ", stale" : ""}`}
    >
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.ageLabel}>{label}</span> {age}
      {price.status === "stale" && (
        <span className={styles.srOnly}>, stale</span>
      )}
    </span>
  );
}

function CraftRow({
  craft,
  rowIndex,
  sortKey,
  focus,
  wide,
  reveal,
}: {
  craft: Craft;
  rowIndex: number;
  sortKey: SortKey;
  focus: boolean;
  wide: boolean;
  reveal: boolean;
}) {
  const { recipe } = craft;
  const complete = craft.status === "complete" ? craft : undefined;
  const missing = craft.missingPrices.length;
  const value = (
    key: SortKey,
    amount: number | undefined,
    format: (amount: number) => string,
  ) => (
    <td
      className={cx(
        styles.number,
        sortKey === key && styles.sorted,
        amount !== undefined && amount < 0 && styles.loss,
      )}
    >
      {amount === undefined ? "—" : format(amount)}
    </td>
  );

  return (
    <tr
      aria-rowindex={rowIndex}
      className={cx(
        styles.row,
        complete === undefined && styles.incomplete,
        reveal && styles.reveal,
      )}
      style={reveal ? ({ "--i": rowIndex } as CSSProperties) : undefined}
    >
      <th scope="row" className={styles.item}>
        <span className={styles.itemInner}>
          <ItemIcon id={craft.itemId} />
          <span className={styles.itemText}>
            <span className={styles.nameLine}>
              <span className={styles.name} title={itemName(craft.itemId)}>
                {itemName(craft.itemId).replace(/ \d\.\d$/, "")}
              </span>
              <span className={styles.tier} data-enchant={recipe.enchant}>
                {recipe.tier}.{recipe.enchant}
              </span>
              {craft.specialty && (
                <span className={styles.specialty}>Specialty</span>
              )}
            </span>
            {complete === undefined && (
              <span className={styles.missing}>
                {plural(missing, "price", "prices")} missing
              </span>
            )}
          </span>
        </span>
      </th>
      {value("profit", complete?.profit, formatSilver)}
      {value("margin", complete?.margin, formatPercent)}
      {focus &&
        value("silverPerFocus", complete?.silverPerFocus, formatSilverPerFocus)}
      {wide && (
        <>
          <td className={styles.number}>
            {craft.materialCost.status === "complete"
              ? formatSilver(craft.materialCost.total)
              : "—"}
          </td>
          <td className={styles.number}>
            {craft.revenue.status === "missing"
              ? "—"
              : formatSilver(craft.revenue.net)}
          </td>
        </>
      )}
      <td className={styles.number}>{formatPercent(craft.rrr)}</td>
      <td className={styles.prices}>
        <span className={styles.ages}>
          <PriceAge label="item" price={craft.itemPrice} />
          <PriceAge label="materials" price={craft.oldestMaterialPrice} />
        </span>
      </td>
    </tr>
  );
}

export function CraftsTable({
  crafts,
  focus,
}: {
  crafts: readonly Craft[];
  focus: boolean;
}) {
  const [chosenSortKey, setSortKey] = useState<SortKey>();
  const sortKey =
    chosenSortKey === undefined ||
    (chosenSortKey === "silverPerFocus" && !focus)
      ? defaultSortKey(focus)
      : chosenSortKey;
  const wide = useMediaQuery("(min-width: 1100px)");
  const revealing = useRevealing();
  const bodyRef = useRef<HTMLTableSectionElement>(null);
  const scrollMargin = useOffsetTop(bodyRef);

  const lines = useMemo((): Line[] => {
    const ranked = rank(crafts, sortKey);
    const firstIncomplete = ranked.findIndex(
      ({ status }) => status === "incomplete",
    );
    const lineOf = (craft: Craft): Line => ({ kind: "craft", craft });
    return firstIncomplete === -1
      ? ranked.map(lineOf)
      : [
          ...ranked.slice(0, firstIncomplete).map(lineOf),
          { kind: "divider", count: ranked.length - firstIncomplete },
          ...ranked.slice(firstIncomplete).map(lineOf),
        ];
  }, [crafts, sortKey]);

  const virtualizer = useWindowVirtualizer({
    count: lines.length,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
    scrollMargin,
  });
  const rows = virtualizer.getVirtualItems();
  const spaceAbove = (rows[0]?.start ?? scrollMargin) - scrollMargin;
  const spaceBelow =
    virtualizer.getTotalSize() -
    ((rows.at(-1)?.end ?? scrollMargin) - scrollMargin);
  const columns = 5 + (focus ? 1 : 0) + (wide ? 2 : 0);

  if (crafts.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>Nothing to rank</p>
        <p>No recipes can be crafted on this route.</p>
      </div>
    );
  }

  const complete = crafts.filter(({ status }) => status === "complete").length;
  const spacer = (height: number) =>
    height > 0 && (
      <tr aria-hidden="true">
        <td colSpan={columns} className={styles.spacer} style={{ height }} />
      </tr>
    );

  return (
    <section className={styles.ledger} aria-label="Best crafts">
      <p className={styles.summary}>
        <strong>{plural(complete, "craft", "crafts")}</strong> ranked by{" "}
        {SORT_LABELS[sortKey]}
        {complete < crafts.length &&
          ` · ${plural(crafts.length - complete, "craft", "crafts")} missing prices`}
      </p>
      <div className={styles.scroller}>
        <table className={styles.table} aria-rowcount={lines.length + 1}>
          <colgroup>
            <col className={styles.itemColumn} />
            <col className={styles.silverColumn} />
            <col className={styles.percentColumn} />
            {focus && <col className={styles.percentColumn} />}
            {wide && (
              <>
                <col className={styles.silverColumn} />
                <col className={styles.silverColumn} />
              </>
            )}
            <col className={styles.percentColumn} />
            <col className={styles.pricesColumn} />
          </colgroup>
          <thead>
            <tr aria-rowindex={1}>
              <th scope="col">Item</th>
              <SortHeader
                sortKey="profit"
                label="Profit"
                active={sortKey}
                onSort={setSortKey}
              />
              <SortHeader
                sortKey="margin"
                label="Margin"
                active={sortKey}
                onSort={setSortKey}
              />
              {focus && (
                <SortHeader
                  sortKey="silverPerFocus"
                  label="Silver/focus"
                  active={sortKey}
                  onSort={setSortKey}
                />
              )}
              {wide && (
                <>
                  <th scope="col" className={styles.number}>
                    Materials
                  </th>
                  <th scope="col" className={styles.number}>
                    Revenue
                  </th>
                </>
              )}
              <th scope="col" className={styles.number}>
                Return rate
              </th>
              <th scope="col">Prices</th>
            </tr>
          </thead>
          <tbody ref={bodyRef}>
            {spacer(spaceAbove)}
            {rows.map(({ index }) => {
              const line = lines[index];
              if (line === undefined) {
                return null;
              }
              if (line.kind === "divider") {
                return (
                  <tr
                    key="divider"
                    aria-rowindex={index + 2}
                    className={styles.divider}
                  >
                    <td colSpan={columns}>
                      Missing prices · {plural(line.count, "craft", "crafts")}
                    </td>
                  </tr>
                );
              }
              return (
                <CraftRow
                  key={line.craft.itemId}
                  craft={line.craft}
                  rowIndex={index + 2}
                  sortKey={sortKey}
                  focus={focus}
                  wide={wide}
                  reveal={revealing && index < REVEALED_ROWS}
                />
              );
            })}
            {spacer(spaceBelow)}
          </tbody>
        </table>
      </div>
    </section>
  );
}
