import type { Evaluation } from "./evaluate.types.js";
import type { SortDirection, SortKey } from "./rank.types.js";

// `sortKey` is a value the engine works out, or a function that reads one it
// doesn't, such as how many of the item sell a day.
export function rank<T extends Evaluation>(
  results: readonly T[],
  sortKey: SortKey | ((result: T) => number | undefined),
  direction: SortDirection = "descending",
): T[] {
  const sign = direction === "descending" ? 1 : -1;
  return results
    .map((result) => {
      const value =
        result.status !== "complete"
          ? undefined
          : typeof sortKey === "function"
            ? sortKey(result)
            : result[sortKey];
      const group =
        result.status === "incomplete" ? 2 : value === undefined ? 1 : 0;
      return { result, value, group };
    })
    .sort(
      (a, b) => a.group - b.group || sign * ((b.value ?? 0) - (a.value ?? 0)),
    )
    .map(({ result }) => result);
}
