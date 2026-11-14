export interface Schedule {
  // Stops the next runs, aborts the one running, and waits for it to end.
  stop(): Promise<void>;
}

// Runs `task` now, then `intervalMs` after each run ends, so runs never
// overlap however long one takes.
export function runEvery(
  intervalMs: number,
  task: (signal: AbortSignal) => Promise<void>,
  onError: (error: unknown) => void,
): Schedule {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running: Promise<void> = Promise.resolve();

  function start() {
    running = task(controller.signal)
      .catch(onError)
      .finally(() => {
        if (!controller.signal.aborted) {
          timer = setTimeout(start, intervalMs);
        }
      });
  }
  start();

  return {
    async stop() {
      controller.abort();
      clearTimeout(timer);
      await running;
    },
  };
}
