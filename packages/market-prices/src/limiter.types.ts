export interface Limiter {
  run<T>(task: () => Promise<T>, onWait?: (ms: number) => void): Promise<T>;
  pauseUntil(time: number): void;
}
