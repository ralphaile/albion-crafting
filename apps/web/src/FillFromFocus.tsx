import { useId, useState } from "react";

import type { FocusBudget } from "@aoc/core";

import styles from "./FillFromFocus.module.css";
import { formatCount } from "./format.helpers";
import { MAX_PLAN_QUANTITY } from "./plan.constants";

export type FillBudget = FocusBudget & { maxQuantity: number };

const DEFAULT_FOCUS = "10000";
const DEFAULT_MAX_QUANTITY = "100";
const MAX_FOCUS = 1_000_000;
const MAX_SILVER = 1_000_000_000_000;

function whole(text: string, min: number, max: number): number | undefined {
  const value = Number(text);
  return text.trim() !== "" &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
    ? value
    : undefined;
}

// Asks for a focus budget and fills the plan with the best crafts for it.
// `unavailable` says why it can't, if it can't.
export function FillFromFocus({
  onFill,
  unavailable,
}: {
  onFill: (budget: FillBudget) => number;
  unavailable: string | undefined;
}) {
  const [focus, setFocus] = useState(DEFAULT_FOCUS);
  const [maxQuantity, setMaxQuantity] = useState(DEFAULT_MAX_QUANTITY);
  const [silver, setSilver] = useState("");
  const [added, setAdded] = useState<number>();
  const focusId = useId();
  const maxId = useId();
  const silverId = useId();

  const budget = {
    focus: whole(focus, 1, MAX_FOCUS),
    maxQuantity: whole(maxQuantity, 1, MAX_PLAN_QUANTITY),
    silver: silver.trim() === "" ? null : whole(silver, 1, MAX_SILVER),
  };
  const valid =
    budget.focus !== undefined &&
    budget.maxQuantity !== undefined &&
    budget.silver !== undefined;

  return (
    <form
      className={styles.fill}
      aria-label="Fill from focus"
      onSubmit={(event) => {
        event.preventDefault();
        if (
          budget.focus === undefined ||
          budget.maxQuantity === undefined ||
          budget.silver === undefined
        ) {
          return;
        }
        setAdded(
          onFill({
            focus: budget.focus,
            maxQuantity: budget.maxQuantity,
            ...(budget.silver !== null && { silver: budget.silver }),
          }),
        );
      }}
    >
      <label htmlFor={focusId}>Focus</label>
      <input
        id={focusId}
        type="number"
        min={1}
        value={focus}
        onChange={(event) => {
          setFocus(event.target.value);
        }}
      />
      <label htmlFor={maxId}>Max per item</label>
      <input
        id={maxId}
        type="number"
        min={1}
        max={MAX_PLAN_QUANTITY}
        value={maxQuantity}
        onChange={(event) => {
          setMaxQuantity(event.target.value);
        }}
      />
      <label htmlFor={silverId}>Silver budget</label>
      <input
        id={silverId}
        type="number"
        min={1}
        placeholder="No limit"
        value={silver}
        onChange={(event) => {
          setSilver(event.target.value);
        }}
      />
      <button
        type="submit"
        disabled={!valid || unavailable !== undefined}
        title={unavailable}
      >
        Fill from focus
      </button>
      <span role="status" className={styles.status}>
        {added === undefined
          ? ""
          : added === 0
            ? "Nothing fits the budget"
            : `Added ${formatCount(added)} ${added === 1 ? "craft" : "crafts"}`}
      </span>
    </form>
  );
}
