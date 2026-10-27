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
    run(task, onWait) {
      return new Promise((resolve, reject) => {
        queue.push({
          onWait,
          start: () => {
            void task()
              .then(resolve, reject)
              .finally(() => {
                running -= 1;
                next();
              });
          },
        });
        next();
      });
    },
    pauseUntil(time) {
      pausedUntil = Math.max(pausedUntil, time);
    },
  };
}
