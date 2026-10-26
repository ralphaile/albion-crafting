import type { Evaluation } from "./evaluate.js";

export type SortKey = "profit" | "margin" | "silverPerFocus";

export function defaultSortKey(focus: boolean): SortKey {
  return focus ? "silverPerFocus" : "profit";
}

export function rank(
  results: readonly Evaluation[],
  sortKey: SortKey,
): Evaluation[] {
  return results
    .map((result) => {
      const value = result.status === "complete" ? result[sortKey] : undefined;
      const group =
        result.status === "incomplete" ? 2 : value === undefined ? 1 : 0;
      return { result, value, group };
    })
    .sort((a, b) => a.group - b.group || (b.value ?? 0) - (a.value ?? 0))
    .map(({ result }) => result);
}
