import { useId, useRef, useState } from "react";

import styles from "./AddToPlan.module.css";
import { MAX_PLAN_QUANTITY } from "./plan.constants";
import { useDismiss } from "./useDismiss";

// Asks how many to craft, then adds them to the plan. `name` is the item's.
export function AddToPlan({
  name,
  compact = false,
  onAdd,
}: {
  name: string;
  compact?: boolean;
  onAdd: (quantity: number) => void;
}) {
  const [open, setOpen] = useState<"asking" | "added">();
  const [quantity, setQuantity] = useState("1");
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const formId = useId();
  const inputId = useId();

  useDismiss(
    open !== undefined,
    () => {
      setOpen(undefined);
    },
    wrapRef,
    buttonRef,
  );

  const count = Number(quantity);
  const valid =
    Number.isInteger(count) && count >= 1 && count <= MAX_PLAN_QUANTITY;

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <button
        ref={buttonRef}
        type="button"
        className={compact ? styles.icon : styles.button}
        aria-label={compact ? `Add ${name} to plan` : undefined}
        title={compact ? "Add to plan" : undefined}
        aria-expanded={open !== undefined}
        aria-controls={open === undefined ? undefined : formId}
        onClick={() => {
          setOpen((was) => (was === undefined ? "asking" : undefined));
        }}
      >
        {compact ? (
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 3v10M3 8h10" />
          </svg>
        ) : (
          "Add to plan"
        )}
      </button>
      {open === "asking" && (
        <form
          id={formId}
          className={styles.popover}
          aria-label={`Add ${name} to plan`}
          onSubmit={(event) => {
            event.preventDefault();
            if (valid) {
              onAdd(count);
              setOpen("added");
            }
          }}
        >
          <label htmlFor={inputId}>Quantity</label>
          <input
            id={inputId}
            type="number"
            min={1}
            max={MAX_PLAN_QUANTITY}
            value={quantity}
            // eslint-disable-next-line jsx-a11y/no-autofocus -- the popover only asks this one thing
            autoFocus
            onChange={(event) => {
              setQuantity(event.target.value);
            }}
          />
          <button type="submit" disabled={!valid}>
            Add
          </button>
        </form>
      )}
      {open === "added" && (
        <p id={formId} className={styles.popover} role="status">
          Added to the plan. <a href="#plan">Open plan</a>
        </p>
      )}
    </div>
  );
}
