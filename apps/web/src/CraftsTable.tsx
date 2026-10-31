import {
  Fragment,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import {
  defaultSortKey,
  rank,
  type SortDirection,
  type SortKey,
} from "@aoc/core";
import { itemName } from "@aoc/crafting-data";

import type { Craft, UsedPrice } from "./best-crafts.types";
import { Chevron } from "./Chevron";
import styles from "./CraftsTable.module.css";
import {
  formatAge,
  formatCount,
  formatPercent,
  formatSilver,
  formatSilverPerFocus,
} from "./format.helpers";
import { ItemIcon } from "./ItemIcon";
import { Pager } from "./Pager";
import { PAGE_SIZE } from "./pager.constants";
import { PriceBadge } from "./PriceBadge";

interface Sort {
  key: SortKey;
  direction: SortDirection;
}

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

function SortHeader({
  sortKey,
  label,
  active,
  onSort,
}: {
  sortKey: SortKey;
  label: string;
  active: Sort;
  onSort: (sortKey: SortKey) => void;
}) {
  const sorted = sortKey === active.key;
  return (
    <th
      scope="col"
      className={cx(styles.number, sorted && styles.sorted)}
      aria-sort={sorted ? active.direction : undefined}
    >
      <button
        type="button"
        className={styles.sortButton}
        onClick={() => {
          onSort(sortKey);
        }}
      >
        {label}
        <Chevron
          className={styles.arrow}
          up={sorted && active.direction === "ascending"}
        />
      </button>
    </th>
  );
}

const MISSING: UsedPrice = { status: "missing", origin: "api" };

function PriceAge({ label, price }: { label: string; price: UsedPrice }) {
  return (
    <span className={styles.age}>
      <PriceBadge price={price} announceName>
        <span>
          <span className={styles.ageLabel}>{label} </span>
          {price.status === "missing" ? "missing" : formatAge(price.ageMinutes)}
        </span>
      </PriceBadge>
    </span>
  );
}

// The oldest material price, or missing when any of them is.
function materialsPrice({ materialPrices, oldestMaterialPrice }: Craft) {
  return [...materialPrices.values()].some(({ status }) => status === "missing")
    ? MISSING
    : (oldestMaterialPrice ?? MISSING);
}

function CraftRow({
  craft,
  rowIndex,
  sortKey,
  focus,
  wide,
  onShowCraft,
}: {
  craft: Craft;
  rowIndex: number;
  sortKey: SortKey;
  focus: boolean;
  wide: boolean;
  onShowCraft: (itemId: string) => void;
}) {
  const showCraft = () => {
    onShowCraft(craft.itemId);
  };
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
      className={cx(styles.row, complete === undefined && styles.incomplete)}
      onClick={(event) => {
        if (
          event.target instanceof Element &&
          event.target.closest("button") === null
        ) {
          showCraft();
        }
      }}
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
              <button
                type="button"
                className={styles.missing}
                aria-haspopup="dialog"
                onClick={showCraft}
              >
                {plural(missing, "price", "prices")} missing
              </button>
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
        <span className={styles.pricesInner}>
          <span className={styles.ages}>
            <PriceAge label="item" price={craft.itemPrice} />
            <PriceAge label="materials" price={materialsPrice(craft)} />
          </span>
          <button
            type="button"
            className={styles.edit}
            aria-label={`Prices for ${itemName(craft.itemId)}`}
            title="Type a price"
            aria-haspopup="dialog"
            onClick={showCraft}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M10.5 2.5l3 3L6 13H3v-3z" />
              <path d="M9 4l3 3" />
            </svg>
          </button>
        </span>
      </td>
    </tr>
  );
}

const IGNORE_SHOW_CRAFT = () => undefined;

export function CraftsTable({
  crafts,
  focus,
  onShowCraft = IGNORE_SHOW_CRAFT,
}: {
  crafts: readonly Craft[];
  focus: boolean;
  onShowCraft?: (itemId: string) => void;
}) {
  const [chosenSort, setChosenSort] = useState<Sort>();
  const sort: Sort =
    chosenSort === undefined || (chosenSort.key === "silverPerFocus" && !focus)
      ? { key: defaultSortKey(focus), direction: "descending" }
      : chosenSort;
  const { key: sortKey, direction } = sort;
  // Remembers what the page was chosen for, so new crafts or a new sort start again at the first page.
  const [chosenPage, setChosenPage] = useState({
    crafts,
    sortKey,
    direction,
    page: 0,
  });
  const wide = useMediaQuery("(min-width: 1100px)");
  const ledgerRef = useRef<HTMLElement>(null);
  const ranked = useMemo(
    () => rank(crafts, sortKey, direction),
    [crafts, sortKey, direction],
  );

  if (crafts.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>Nothing to rank</p>
        <p>No recipes can be crafted on this route.</p>
      </div>
    );
  }

  const firstIncomplete = ranked.findIndex(
    ({ status }) => status === "incomplete",
  );
  const complete = firstIncomplete === -1 ? ranked.length : firstIncomplete;
  const missing = plural(ranked.length - complete, "craft", "crafts");
  const pageCount = Math.ceil(ranked.length / PAGE_SIZE);
  const page =
    chosenPage.crafts === crafts &&
    chosenPage.sortKey === sortKey &&
    chosenPage.direction === direction
      ? Math.min(chosenPage.page, pageCount - 1)
      : 0;
  const start = page * PAGE_SIZE;
  const columns = 5 + (focus ? 1 : 0) + (wide ? 2 : 0);
  const rowIndexOf = (index: number) =>
    index + 2 + (firstIncomplete !== -1 && index >= firstIncomplete ? 1 : 0);

  function showPage(next: number) {
    setChosenPage({ crafts, sortKey, direction, page: next });
    ledgerRef.current?.scrollIntoView({ block: "start" });
    ledgerRef.current?.focus({ preventScroll: true });
  }

  function sortBy(key: SortKey) {
    setChosenSort(
      key === sortKey
        ? {
            key,
            direction: direction === "descending" ? "ascending" : "descending",
          }
        : { key, direction: "descending" },
    );
  }

  return (
    <section
      ref={ledgerRef}
      className={styles.ledger}
      aria-label="Best crafts"
      tabIndex={-1}
    >
      <div className={styles.scroller}>
        <table
          className={styles.table}
          aria-rowcount={ranked.length + (firstIncomplete === -1 ? 1 : 2)}
        >
          <colgroup>
            <col className={styles.itemColumn} />
            <col className={styles.silverColumn} />
            <col className={styles.percentColumn} />
            {focus && <col className={styles.silverPerFocusColumn} />}
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
                active={sort}
                onSort={sortBy}
              />
              <SortHeader
                sortKey="margin"
                label="Margin"
                active={sort}
                onSort={sortBy}
              />
              {focus && (
                <SortHeader
                  sortKey="silverPerFocus"
                  label="Silver/focus"
                  active={sort}
                  onSort={sortBy}
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
          <tbody>
            {ranked.slice(start, start + PAGE_SIZE).map((craft, offset) => {
              const index = start + offset;
              return (
                <Fragment key={craft.itemId}>
                  {index === firstIncomplete && (
                    <tr aria-rowindex={index + 2} className={styles.divider}>
                      <td colSpan={columns}>Missing prices · {missing}</td>
                    </tr>
                  )}
                  <CraftRow
                    craft={craft}
                    rowIndex={rowIndexOf(index)}
                    sortKey={sortKey}
                    focus={focus}
                    wide={wide}
                    onShowCraft={onShowCraft}
                  />
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {pageCount > 1 && (
        <Pager
          label="Crafts"
          page={page}
          pageCount={pageCount}
          total={ranked.length}
          onPage={showPage}
        />
      )}
    </section>
  );
}
