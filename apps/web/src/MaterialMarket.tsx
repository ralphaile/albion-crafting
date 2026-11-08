import { useId, useRef, useState } from "react";

import { itemName } from "@aoc/crafting-data";

import type { PinMaterialHandler } from "./material-pins.types";
import styles from "./MaterialMarket.module.css";
import { BUY_MARKET_GROUPS } from "./route.constants";
import { marketName } from "./route.helpers";
import { useDismiss } from "./useDismiss";

const PIN_ICON = (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M6 2h4l-.5 4 2.5 2.5H4L6.5 6zM8 8.5V14" />
  </svg>
);

// A pin button to buy a material in another market than the route's, or to go
// back to the route's. It's filled while the material is pinned. Its list
// opens towards `opens`, so it stays inside a panel at the page's edge.
export function MaterialMarket({
  itemId,
  marketId,
  pinned,
  opens = "right",
  onPin,
}: {
  itemId: string;
  marketId: string;
  pinned: boolean;
  opens?: "left" | "right";
  onPin: PinMaterialHandler;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const close = () => {
    setOpen(false);
  };
  useDismiss(open, close, wrapRef, buttonRef);
  const name = itemName(itemId);
  const market = marketName(marketId);
  const choose = (pin: string | undefined) => {
    onPin(itemId, pin);
    close();
    buttonRef.current?.focus();
  };

  return (
    <span ref={wrapRef} className={styles.wrap}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.icon}
        data-pinned={pinned}
        aria-label={`Market for ${name}: ${market}${pinned ? ", pinned" : ""}`}
        title={pinned ? "Pinned to this market" : "Pin to a market"}
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => {
          setOpen((was) => !was);
        }}
      >
        {PIN_ICON}
      </button>
      {open && (
        <span
          id={listId}
          role="group"
          aria-label={`Buy ${name} in`}
          className={styles.popover}
          data-opens={opens}
        >
          {pinned && (
            <button
              type="button"
              className={styles.unpin}
              onClick={() => {
                choose(undefined);
              }}
            >
              Back to the route’s market
            </button>
          )}
          {BUY_MARKET_GROUPS.flatMap(({ options }) => options).map(
            ({ id, label }) => (
              <button
                key={id}
                type="button"
                aria-pressed={pinned && id === marketId}
                onClick={() => {
                  choose(id);
                }}
              >
                {label}
              </button>
            ),
          )}
        </span>
      )}
    </span>
  );
}
