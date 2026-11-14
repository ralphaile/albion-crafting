import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runEvery } from "./schedule.helpers.js";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("runEvery", () => {
  it("runs now, then again the interval after each run ends", async () => {
    const task = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5000));
    });
    const schedule = runEvery(60_000, task, () => undefined);

    expect(task).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(64_999);
    expect(task).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(task).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(5000);
    await schedule.stop();
  });

  it("reports a failed run and runs again after it", async () => {
    const onError = vi.fn();
    const task = vi.fn(() => Promise.reject(new Error("AODP is down")));
    const schedule = runEvery(1000, task, onError);

    await vi.advanceTimersByTimeAsync(1000);

    expect(onError).toHaveBeenCalledWith(new Error("AODP is down"));
    expect(task).toHaveBeenCalledTimes(2);
    await schedule.stop();
  });

  it("aborts the run going on when stopped, waits for it, and runs no more", async () => {
    let aborted = false;
    const task = vi.fn(
      (signal: AbortSignal) =>
        new Promise<void>((resolve) => {
          signal.addEventListener("abort", () => {
            aborted = true;
            resolve();
          });
        }),
    );
    const schedule = runEvery(1000, task, () => undefined);

    await schedule.stop();
    await vi.advanceTimersByTimeAsync(10_000);

    expect(aborted).toBe(true);
    expect(task).toHaveBeenCalledTimes(1);
  });
});
