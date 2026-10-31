import { Chevron } from "./Chevron";
import { formatCount } from "./format.helpers";
import { PAGE_SIZE } from "./pager.constants";
import styles from "./Pager.module.css";

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

export function Pager({
  label,
  page,
  pageCount,
  total,
  onPage,
}: {
  label: string;
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
        {label} {formatCount(first)}–{formatCount(last)} of {formatCount(total)}
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
