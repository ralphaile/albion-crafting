import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createLimiter } from "./limiter.helpers.js";
import type { Limiter } from "./limiter.types.js";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// Queues `count` tasks that finish at once, and returns the second each one started at
function startTimes(
  limiter: Limiter,
  count: number,
  onWait?: (ms: number) => void,
): number[] {
  const startedAt = Date.now();
  const started: number[] = [];
  for (let index = 0; index < count; index += 1) {
    void limiter.run(() => {
      started.push((Date.now() - startedAt) / 1000);
      return Promise.resolve();
    }, onWait);
  }
  return started;
}

function countBySecond(seconds: number[]): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const second of seconds) {
    counts[second] = (counts[second] ?? 0) + 1;
  }
  return counts;
}

describe("createLimiter", () => {
  it("starts at most 180 requests a minute, and says how long the next one waits", async () => {
    const onWait = vi.fn();
    const started = startTimes(createLimiter(), 181, onWait);

    await vi.advanceTimersByTimeAsync(60_000);

    expect(countBySecond(started)).toEqual({ 0: 180, 60: 1 });
    expect(onWait).toHaveBeenCalledExactlyOnceWith(60_000);
  });

  it("starts at most 300 requests in 5 minutes", async () => {
    const started = startTimes(createLimiter(), 301);

    await vi.advanceTimersByTimeAsync(300_000);

    expect(countBySecond(started)).toEqual({ 0: 180, 60: 120, 300: 1 });
  });

  it("runs at most 3 requests at once", async () => {
    const limiter = createLimiter();
    let running = 0;
    let most = 0;
    const tasks = Array.from({ length: 7 }, () =>
      limiter.run(async () => {
        running += 1;
        most = Math.max(most, running);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        running -= 1;
      }),
    );

    await vi.advanceTimersByTimeAsync(3000);

    await expect(Promise.all(tasks)).resolves.toHaveLength(7);
    expect(most).toBe(3);
  });

  it("passes on a failed request and frees its place", async () => {
    const limiter = createLimiter();
    const failures = Array.from({ length: 3 }, () =>
      limiter.run(() => Promise.reject(new Error("offline"))),
    );

    for (const failure of failures) {
      await expect(failure).rejects.toThrow("offline");
    }
    await expect(limiter.run(() => Promise.resolve("next"))).resolves.toBe(
      "next",
    );
  });

  it("waits until the latest pause ends, even one set while waiting", async () => {
    const limiter = createLimiter();
    const onWait = vi.fn();
    limiter.pauseUntil(Date.now() + 10_000);
    const started = startTimes(limiter, 1, onWait);

    await vi.advanceTimersByTimeAsync(5000);
    limiter.pauseUntil(Date.now() + 25_000);
    limiter.pauseUntil(Date.now() + 1000);
    await vi.advanceTimersByTimeAsync(25_000);

    expect(started).toEqual([30]);
    expect(onWait.mock.calls).toEqual([[10_000], [20_000]]);
  });
});
