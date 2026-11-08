import { useId, useState } from "react";

import type { FocusBudget } from "@aoc/core";

import controls from "./controls.module.css";
import styles from "./FillFromFocus.module.css";
import { formatCount } from "./format.helpers";
import { wholeNumber } from "./number-input.helpers";
import { MAX_PLAN_QUANTITY } from "./plan.constants";

export type FillBudget = FocusBudget & { maxQuantity: number };

const DEFAULT_MAX_QUANTITY = "100";
const MAX_SILVER = 1_000_000_000_000;

// Fills the plan with the best crafts for `focus`, the focus you have.
// `unavailable` says why it can't, if it can't.
export function FillFromFocus({
  focus,
  onFill,
  unavailable,
}: {
  focus: number | undefined;
  onFill: (budget: FillBudget) => number;
  unavailable: string | undefined;
}) {
  const [maxQuantity, setMaxQuantity] = useState(DEFAULT_MAX_QUANTITY);
  const [silver, setSilver] = useState("");
  const [added, setAdded] = useState<number>();
  const maxId = useId();
  const silverId = useId();

  const budget = {
    focus,
    maxQuantity: wholeNumber(maxQuantity, 1, MAX_PLAN_QUANTITY),
    silver: silver.trim() === "" ? null : wholeNumber(silver, 1, MAX_SILVER),
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
        className={controls.button}
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
