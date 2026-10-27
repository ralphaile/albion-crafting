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

export const PAGE_SIZE = 50;

const SORT_LABELS: Record<SortKey, string> = {
  profit: "profit per craft",
  margin: "margin",
  silverPerFocus: "silver per focus",
};

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

// The first and last pages, and the ones either side of the current page.
function pagesAround(current: number, count: number) {
  const shown = [...new Set([0, current - 1, current, current + 1, count - 1])]
    .filter((page) => page >= 0 && page < count)
    .sort((a, b) => a - b);
  return shown.flatMap((page, index): (number | "gap")[] => {
    const previous = shown[index - 1];
    if (previous === undefined || page === previous + 1) {
      return [page];
    }
    return page === previous + 2 ? [previous + 1, page] : ["gap", page];
  });
}

function Chevron({
  className,
  up = false,
}: {
  className: string | undefined;
  up?: boolean;
}) {
  return (
    <svg className={className} viewBox="0 0 10 6" aria-hidden="true">
      <path d={up ? "M1 5l4-4 4 4" : "M1 1l4 4 4-4"} />
    </svg>
  );
}

function Pager({
  page,
  pageCount,
  total,
  onPage,
}: {
  page: number;
  pageCount: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const first = page * PAGE_SIZE + 1;
  const last = Math.min(total, (page + 1) * PAGE_SIZE);
  return (
    <nav className={styles.pager} aria-label="Pages">
      <p className={styles.range}>
        Crafts {formatCount(first)}–{formatCount(last)} of {formatCount(total)}
      </p>
      <div className={styles.pages}>
        <button
          type="button"
          className={styles.step}
          disabled={page === 0}
          onClick={() => {
            onPage(page - 1);
          }}
        >
          <Chevron className={styles.previous} />
          <span className={styles.stepLabel}>Previous</span>
        </button>
        <ol className={styles.pageList}>
          {pagesAround(page, pageCount).map((entry, index) =>
            entry === "gap" ? (
              <li key={`gap-${String(index)}`} className={styles.gap}>
                …
              </li>
            ) : (
              <li key={entry}>
                <button
                  type="button"
                  className={styles.pageButton}
                  aria-label={`Page ${String(entry + 1)}`}
                  aria-current={entry === page ? "page" : undefined}
                  onClick={() => {
                    onPage(entry);
                  }}
                >
                  {formatCount(entry + 1)}
                </button>
              </li>
            ),
          )}
        </ol>
        <button
          type="button"
          className={styles.step}
          disabled={page === pageCount - 1}
          onClick={() => {
            onPage(page + 1);
          }}
        >
          <span className={styles.stepLabel}>Next</span>
          <Chevron className={styles.next} />
        </button>
      </div>
    </nav>
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
}: {
  craft: Craft;
  rowIndex: number;
  sortKey: SortKey;
  focus: boolean;
  wide: boolean;
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
      className={cx(styles.row, complete === undefined && styles.incomplete)}
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
      <p className={styles.summary}>
        <strong>{plural(complete, "craft", "crafts")}</strong> ranked by{" "}
        {SORT_LABELS[sortKey]}
        {direction === "ascending" && ", lowest first"}
        {complete < ranked.length && (
          <>
            {" · "}
            <button
              type="button"
              className={styles.jump}
              aria-label={`Go to the ${missing} missing prices`}
              onClick={() => {
                showPage(Math.floor(complete / PAGE_SIZE));
              }}
            >
              {missing} missing prices
            </button>
          </>
        )}
      </p>
      <div className={styles.scroller}>
        <table
          className={styles.table}
          aria-rowcount={ranked.length + (firstIncomplete === -1 ? 1 : 2)}
        >
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
                  />
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {pageCount > 1 && (
        <Pager
          page={page}
          pageCount={pageCount}
          total={ranked.length}
          onPage={showPage}
        />
      )}
    </section>
  );
}
