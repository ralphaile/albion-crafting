import { useEffect, useState } from "react";

import { iconUrl } from "@aoc/crafting-data";

const ICON_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='8' fill='%238a7f6b' fill-opacity='0.3'/%3E%3C/svg%3E";

const RETRY_DELAYS_MS = [1000, 3000];

// The copy the site publishes with each deploy: see `pnpm icons`.
export function siteIconUrl(id: string): string {
  return `${import.meta.env.BASE_URL}icons/${id}.png`;
}

// The site's copy first. Without one, such as in `pnpm dev`, the render
// service's, tried again after each delay while it fails, then a placeholder.
export function ItemIcon({ id }: { id: string }) {
  const [failed, setFailed] = useState({ id, times: 0 });
  const [retried, setRetried] = useState({ id, times: 0 });
  const failures = failed.id === id ? failed.times : 0;
  const remoteFailures = Math.max(0, failures - 1);
  const retries = retried.id === id ? retried.times : 0;

  useEffect(() => {
    const delay = RETRY_DELAYS_MS[remoteFailures - 1];
    if (delay === undefined) {
      return;
    }
    const timer = setTimeout(() => {
      setRetried({ id, times: remoteFailures });
    }, delay);
    return () => {
      clearTimeout(timer);
    };
  }, [id, remoteFailures]);

  if (remoteFailures > retries) {
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
      key={failures}
      src={failures === 0 ? siteIconUrl(id) : iconUrl(id)}
      alt=""
      width={64}
      height={64}
      loading="lazy"
      onError={() => {
        setFailed({ id, times: failures + 1 });
      }}
    />
  );
}
