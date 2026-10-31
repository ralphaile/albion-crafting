import { useEffect, useMemo, useRef, useState } from "react";

import { searchAmong } from "@aoc/crafting-data";

import { formatCount } from "./format.helpers";
import type { ManualPrice, ManualPriceKey } from "./manual-prices.types";
import type { MissingPrice } from "./missing-prices.types";
import styles from "./MissingPricesPanel.module.css";
import { Pager } from "./Pager";
import { PAGE_SIZE } from "./pager.constants";
import { PriceRow } from "./PriceRow";
import { SidePanel } from "./SidePanel";

interface FocusTarget {
  id: string | undefined;
  index: number;
}

function priceId({ itemId, marketId, source }: ManualPriceKey) {
  return `${itemId} ${marketId} ${source}`;
}

function plural(count: number, one: string, many: string) {
  return `${formatCount(count)} ${count === 1 ? one : many}`;
}

export function MissingPricesPanel({
  missingPrices,
  onSave,
  onRemove,
}: {
  missingPrices: readonly MissingPrice[];
  onSave: (price: ManualPrice) => void;
  onRemove: (key: ManualPriceKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const [chosenPage, setChosenPage] = useState(0);
  const [query, setQuery] = useState("");
  const listRef = useRef<HTMLUListElement>(null);
  // Where focus goes once the list has caught up with a saved price.
  const focusTarget = useRef<FocusTarget | undefined>(undefined);
  const matching = useMemo(() => {
    if (query.trim() === "") {
      return missingPrices;
    }
    const found = new Set(
      searchAmong(
        missingPrices.map(({ key }) => key.itemId),
        query,
      ),
    );
    return missingPrices.filter(({ key }) => found.has(key.itemId));
  }, [missingPrices, query]);
  const total = missingPrices.length;
  const pageCount = Math.max(1, Math.ceil(matching.length / PAGE_SIZE));
  const page = Math.min(chosenPage, pageCount - 1);
  const shown = matching.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const shownIds = shown.map(({ key }) => priceId(key));

  useEffect(() => {
    const target = focusTarget.current;
    if (target === undefined) {
      return;
    }
    focusTarget.current = undefined;
    const found = target.id === undefined ? -1 : shownIds.indexOf(target.id);
    const index =
      found === -1 ? Math.min(target.index, shownIds.length - 1) : found;
    listRef.current?.querySelectorAll("input")[index]?.focus();
  });

  return (
    <>
      {total > 0 && (
        <button
          type="button"
          className={styles.open}
          aria-haspopup="dialog"
          onClick={() => {
            setChosenPage(0);
            setQuery("");
            setOpen(true);
          }}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M10.5 2.5l3 3L6 13H3v-3z" />
            <path d="M9 4l3 3" />
          </svg>
          <span>
            <span className={styles.count}>{formatCount(total)}</span>{" "}
            <span className={styles.words}>
              {total === 1 ? "price missing" : "prices missing"}
            </span>
          </span>
        </button>
      )}
      <SidePanel
        heading="Missing prices"
        closeLabel="Close missing prices"
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        footer={
          pageCount > 1 ? (
            <Pager
              label="Prices"
              page={page}
              pageCount={pageCount}
              total={matching.length}
              onPage={(next) => {
                focusTarget.current = { id: undefined, index: 0 };
                setChosenPage(next);
              }}
            />
          ) : undefined
        }
      >
        {total === 0 ? (
          <p className={styles.none}>No prices missing</p>
        ) : (
          <input
            className={styles.search}
            type="search"
            placeholder="Search"
            aria-label="Search missing prices"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setChosenPage(0);
            }}
          />
        )}
        {total > 0 && matching.length === 0 && (
          <p className={styles.none}>No missing prices match</p>
        )}
        {matching.length > 0 && (
          <ul ref={listRef} className={styles.lines}>
            {shown.map(({ key, craftCount }, index) => (
              <PriceRow
                key={shownIds[index]}
                priceKey={key}
                manual={undefined}
                status={`for ${plural(craftCount, "craft", "crafts")}`}
                missing={false}
                onSave={onSave}
                onRemove={onRemove}
                onEntered={() => {
                  focusTarget.current = {
                    id: shownIds[index + 1] ?? shownIds[index - 1],
                    index,
                  };
                }}
              />
            ))}
          </ul>
        )}
      </SidePanel>
    </>
  );
}
