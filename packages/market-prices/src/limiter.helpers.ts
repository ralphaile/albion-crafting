import type { Limiter } from "./limiter.types.js";

const CONCURRENCY = 3;
const LIMITS = [
  { requests: 180, perMs: 60_000 },
  { requests: 300, perMs: 300_000 },
];
const KEPT_STARTS = Math.max(...LIMITS.map(({ requests }) => requests));

interface Queued {
  start: () => void;
  onWait: ((ms: number) => void) | undefined;
}

function errorOf(signal: AbortSignal | undefined): Error {
  const reason: unknown = signal?.reason;
  return reason instanceof Error ? reason : new Error(String(reason));
}

// Counts requests over the last minute and 5 minutes, not per clock minute like
// AODP does, so no clock minute or 5 minutes can get more than AODP allows.
export function createLimiter(): Limiter {
  const starts: number[] = [];
  const queue: Queued[] = [];
  let running = 0;
  let pausedUntil = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function msUntilFree(now: number): number {
    return Math.max(
      pausedUntil - now,
      ...LIMITS.map(({ requests, perMs }) => {
        const oldest = starts.at(-requests);
        return oldest === undefined ? 0 : oldest + perMs - now;
      }),
    );
  }

  function next(): void {
    while (timer === undefined && running < CONCURRENCY) {
      const first = queue[0];
      if (first === undefined) {
        return;
      }
      const now = Date.now();
      const wait = msUntilFree(now);
      if (wait > 0) {
        first.onWait?.(wait);
        timer = setTimeout(() => {
          timer = undefined;
          next();
        }, wait);
        return;
      }
      queue.shift();
      starts.push(now);
      if (starts.length > KEPT_STARTS) {
        starts.shift();
      }
      running += 1;
      first.start();
    }
  }

  return {
    run(task, onWait, signal) {
      return new Promise((resolve, reject) => {
        if (signal?.aborted) {
          reject(errorOf(signal));
          return;
        }
        // A task cancelled while queued leaves the queue without using a request.
        const cancel = () => {
          const index = queue.indexOf(queued);
          if (index !== -1) {
            queue.splice(index, 1);
            reject(errorOf(signal));
          }
        };
        const queued: Queued = {
          onWait,
          start: () => {
            signal?.removeEventListener("abort", cancel);
            void task()
              .then(resolve, reject)
              .finally(() => {
                running -= 1;
                next();
              });
          },
        };
        signal?.addEventListener("abort", cancel, { once: true });
        queue.push(queued);
        next();
      });
    },
    pauseUntil(time) {
      pausedUntil = Math.max(pausedUntil, time);
    },
  };
}
