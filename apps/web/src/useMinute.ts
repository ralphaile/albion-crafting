import { useEffect, useState } from "react";

const MINUTE_MS = 60_000;
const CHECK_EVERY_MS = 10_000;

// The time, changing once a minute, so what depends on it isn't worked out
// again on every render. It's checked every few seconds and when you come back
// to the tab, since a hidden tab's timers can be held back.
export function useMinute(): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const check = () => {
      const time = Date.now();
      if (Math.floor(time / MINUTE_MS) !== Math.floor(now / MINUTE_MS)) {
        setNow(time);
      }
    };
    const timer = setInterval(check, CHECK_EVERY_MS);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [now]);
  return now;
}
