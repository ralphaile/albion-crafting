import { type ReactNode, useId, useRef, useState } from "react";

import type { PriceOrigin } from "@aoc/core";

import type { SeenPrice, UsedPrice } from "./best-crafts.types";
import { formatAgo, formatSilver } from "./format.helpers";
import styles from "./PriceBadge.module.css";

type Kind = "fresh" | "stale" | "manual" | "missing";

const NAMES: Record<Kind, string> = {
  fresh: "API fresh",
  stale: "API stale",
  manual: "Manual",
  missing: "Missing",
};

const TIP_WIDTH = 280;

const ICONS: Record<Kind, ReactNode> = {
  fresh: <path d="M3 8.5l3 3 7-7" />,
  stale: (
    <>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.5V8l2.5 1.5" />
    </>
  ),
  manual: <path d="M10.5 2.5l3 3L6 13H3v-3z" />,
  missing: <path d="M4 4l8 8M12 4l-8 8" />,
};

function kindOf(price: UsedPrice): Kind {
  if (price.status === "missing") {
    return "missing";
  }
  return price.origin === "manual" ? "manual" : price.status;
}

function described(price: SeenPrice, origin: PriceOrigin) {
  const name =
    origin === "manual"
      ? `Manual${price.status === "stale" ? ", stale" : ""}`
      : NAMES[price.status];
  const how = origin === "manual" ? "typed" : "seen";
  return `${name} ${formatSilver(price.value)}, ${how} ${formatAgo(price.ageMinutes)}`;
}

function Icon({ kind }: { kind: Kind }) {
  return (
    <svg className={styles.icon} viewBox="0 0 16 16" aria-hidden="true">
      {ICONS[kind]}
    </svg>
  );
}

// `announceName` adds the badge's name for screen readers, for text that
// doesn't already say where the price came from.
export function PriceBadge({
  price,
  announceName = false,
  children,
}: {
  price: UsedPrice;
  announceName?: boolean;
  children: ReactNode;
}) {
  const kind = kindOf(price);
  const tipId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const pointer = useRef(false);
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [at, setAt] = useState({ top: 0, left: 0 });

  const content = (
    <>
      <Icon kind={kind} />
      {children}
      {announceName && <span className={styles.srOnly}>, {NAMES[kind]}</span>}
    </>
  );

  if (price.status === "missing" || price.passedOver === undefined) {
    return (
      <span
        className={styles.badge}
        data-kind={kind}
        title={
          price.status === "missing"
            ? NAMES.missing
            : described(price, price.origin)
        }
      >
        {content}
      </span>
    );
  }

  // The tip is placed on the screen, so a table that scrolls sideways can't
  // cut it off.
  function place() {
    const box = trigger.current?.getBoundingClientRect();
    if (box !== undefined) {
      setAt({
        top: box.bottom + 6,
        left: Math.max(
          8,
          Math.min(box.left, window.innerWidth - TIP_WIDTH - 8),
        ),
      });
    }
  }

  const other = price.origin === "manual" ? "api" : "manual";
  return (
    <span className={styles.badge} data-kind={kind}>
      <button
        ref={trigger}
        type="button"
        className={styles.trigger}
        aria-describedby={tipId}
        onPointerDown={() => {
          pointer.current = true;
        }}
        onMouseEnter={() => {
          place();
          setHovered(true);
        }}
        onMouseLeave={() => {
          setHovered(false);
        }}
        onFocus={() => {
          // Focus from the keyboard shows the tip; a click or tap toggles it.
          if (!pointer.current) {
            place();
            setPinned(true);
          }
          pointer.current = false;
        }}
        onBlur={() => {
          setPinned(false);
        }}
        onClick={() => {
          place();
          setPinned((was) => !was);
        }}
      >
        {content}
      </button>
      <span
        id={tipId}
        role="tooltip"
        className={styles.tip}
        style={at}
        data-open={hovered || pinned}
      >
        <span>{described(price, price.origin)}</span>{" "}
        <span>Not used: {described(price.passedOver, other)}</span>
      </span>
    </span>
  );
}
