import { useEffect, useState } from "react";

import { iconUrl } from "@aoc/crafting-data";

const ICON_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='8' fill='%23d4d4d4'/%3E%3C/svg%3E";

// The render service draws icons on demand and sometimes answers 502 while it's busy.
const RETRY_DELAYS_MS = [1000, 3000];

export function ItemIcon({ id }: { id: string }) {
  const src = iconUrl(id);
  const [failed, setFailed] = useState({ src, times: 0 });
  const [retried, setRetried] = useState({ src, times: 0 });
  const failures = failed.src === src ? failed.times : 0;
  const retries = retried.src === src ? retried.times : 0;

  useEffect(() => {
    const delay = RETRY_DELAYS_MS[failures - 1];
    if (delay === undefined) {
      return;
    }
    const timer = setTimeout(() => {
      setRetried({ src, times: failures });
    }, delay);
    return () => {
      clearTimeout(timer);
    };
  }, [src, failures]);

  if (failures > retries) {
    return (
      <img
        key="placeholder"
        src={ICON_PLACEHOLDER}
        alt=""
        width={64}
        height={64}
      />
    );
  }
  return (
    <img
      key={retries}
      src={src}
      alt=""
      width={64}
      height={64}
      loading="lazy"
      onError={() => {
        setFailed({ src, times: failures + 1 });
      }}
    />
  );
}
