import { useCallback, useState, useSyncExternalStore } from "react";

import type { BatchFailure } from "@aoc/market-prices";

import { formatAgo } from "./format.helpers";
import styles from "./PriceStatus.module.css";
import type { BestCraftsResult } from "./useBestCrafts";

const MINUTE_MS = 60_000;

function subscribeToOnline(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function useOnline() {
  return useSyncExternalStore(
    subscribeToOnline,
    () => navigator.onLine,
    () => true,
  );
}

// The time, rounded up to the second, read on every render and at least every `everyMs`.
function useNow(everyMs: number) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const timer = setInterval(onChange, everyMs);
      return () => {
        clearInterval(timer);
      };
    },
    [everyMs],
  );
  return useSyncExternalStore(
    subscribe,
    () => Math.ceil(Date.now() / 1000) * 1000,
  );
}

function statusText(bestCrafts: BestCraftsResult, now: number): string {
  const { progress } = bestCrafts;
  if (progress !== undefined) {
    const waitSeconds =
      progress.waitingUntil === undefined
        ? 0
        : Math.ceil((progress.waitingUntil - now) / 1000);
    if (waitSeconds > 0) {
      return `Waiting for API limit, resuming in ${String(waitSeconds)} s`;
    }
    return progress.total > 0
      ? `Fetching prices: ${String(progress.done)} / ${String(progress.total)} batches`
      : "Fetching prices…";
  }
  return bestCrafts.status === "ready" && bestCrafts.fetchedAt !== undefined
    ? `Prices fetched ${formatAgo(Math.floor((now - bestCrafts.fetchedAt) / MINUTE_MS))}`
    : "";
}

// Says what the last fetch couldn't get, or nothing.
function failureText(
  failures: readonly BatchFailure[],
  batches: number,
  fetchedAt: number | undefined,
  online: boolean,
  now: number,
): string {
  if (failures.length < batches || batches === 0) {
    return failures.length === 1
      ? "1 batch failed"
      : `${String(failures.length)} batches failed`;
  }
  const problem = online
    ? "Couldn’t reach the Albion Online Data Project."
    : "You’re offline.";
  return fetchedAt === undefined
    ? problem
    : `${problem} Showing prices from ${formatAgo(Math.floor((now - fetchedAt) / MINUTE_MS))}.`;
}

export function PriceStatus({
  bestCrafts,
  persistent,
}: {
  bestCrafts: BestCraftsResult;
  persistent: boolean;
}) {
  const fetching = bestCrafts.progress !== undefined;
  const now = useNow(fetching ? 1000 : MINUTE_MS / 2);
  const online = useOnline();
  const [dismissed, setDismissed] = useState<readonly BatchFailure[]>();
  const failures =
    bestCrafts.status === "ready" && !bestCrafts.updating
      ? bestCrafts.failures
      : [];
  const failed = failures.length > 0 && failures !== dismissed;
  const everyBatch =
    bestCrafts.status === "ready" &&
    bestCrafts.batches > 0 &&
    failures.length >= bestCrafts.batches;

  return (
    <div className={styles.priceStatus}>
      <div className={styles.line}>
        <p className={styles.text} role="status">
          {statusText(bestCrafts, now)}
        </p>
        {fetching ? (
          <button
            type="button"
            className={styles.button}
            onClick={bestCrafts.cancel}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
            Cancel
          </button>
        ) : (
          <button
            type="button"
            className={styles.button}
            onClick={bestCrafts.refresh}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M13 8a5 5 0 1 1-1.5-3.6M13 2.5v2.5h-2.5" />
            </svg>
            Refresh prices
          </button>
        )}
      </div>
      {failed && bestCrafts.status === "ready" && (
        <div className={styles.failure} role="alert">
          <p className={styles.text}>
            {failureText(
              failures,
              bestCrafts.batches,
              bestCrafts.fetchedAt,
              online,
              now,
            )}
          </p>
          <button
            type="button"
            className={styles.retry}
            onClick={bestCrafts.retry}
          >
            {everyBatch ? "Try again" : "Retry failed"}
          </button>
          <button
            type="button"
            className={styles.dismiss}
            aria-label="Dismiss"
            onClick={() => {
              setDismissed(failures);
            }}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>
      )}
      {!persistent && (
        <p className={styles.note}>
          This browser can’t save prices, so they’re only kept until the page
          closes.
        </p>
      )}
    </div>
  );
}
