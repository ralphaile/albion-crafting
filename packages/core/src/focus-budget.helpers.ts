import type {
  FocusBudget,
  FocusCandidate,
  FocusPick,
} from "./focus-budget.types.js";

function silverPerFocus({ profitPerCraft, focusPerCraft }: FocusCandidate) {
  return profitPerCraft / focusPerCraft;
}

// Greedy: the most silver per focus first, as many crafts as the focus, the
// silver and the item's cap allow, then the next. Crafts that lose silver or
// need no focus are left out.
export function fillFocusBudget(
  candidates: readonly FocusCandidate[],
  { focus, silver = Infinity }: FocusBudget,
): FocusPick[] {
  let focusLeft = focus;
  let silverLeft = silver;
  const picks: FocusPick[] = [];
  const ranked = candidates
    .filter(
      ({ profitPerCraft, focusPerCraft }) =>
        profitPerCraft > 0 && focusPerCraft > 0,
    )
    .toSorted((a, b) => silverPerFocus(b) - silverPerFocus(a));
  for (const candidate of ranked) {
    const { amountCrafted, focusPerCraft, costPerCraft, profitPerCraft } =
      candidate;
    const crafts = Math.min(
      Math.floor(candidate.maxQuantity / amountCrafted),
      Math.floor(focusLeft / focusPerCraft),
      costPerCraft > 0 ? Math.floor(silverLeft / costPerCraft) : Infinity,
    );
    if (crafts <= 0) {
      continue;
    }
    focusLeft -= crafts * focusPerCraft;
    silverLeft -= crafts * costPerCraft;
    picks.push({
      itemId: candidate.itemId,
      alternative: candidate.alternative,
      crafts,
      quantity: crafts * amountCrafted,
      focus: crafts * focusPerCraft,
      cost: crafts * costPerCraft,
      profit: crafts * profitPerCraft,
    });
  }
  return picks;
}
