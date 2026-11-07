export interface Limiter {
  run<T>(
    task: () => Promise<T>,
    onWait?: (ms: number) => void,
    signal?: AbortSignal,
  ): Promise<T>;
  pauseUntil(time: number): void;
}
