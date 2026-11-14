import type { EvaluatePrices, EvaluateSettings } from "./evaluate.types.js";
import type { JournalValue, RecipeJournal } from "./journal.types.js";
import { materialCost } from "./material-cost.helpers.js";
import { revenue } from "./revenue.helpers.js";

export function emptyJournalId(journalId: string): string {
  return `${journalId}_EMPTY`;
}

export function fullJournalId(journalId: string): string {
  return `${journalId}_FULL`;
}

// An empty journal is bought where the materials are, and a full one sold
// where the item is. Premium doesn't add to the fame a journal gets.
export function journalValue(
  journal: RecipeJournal,
  amountCrafted: number,
  settings: EvaluateSettings,
  prices: EvaluatePrices,
): JournalValue {
  const empty = materialCost(
    [{ id: emptyJournalId(journal.id), count: 1, returnable: false }],
    prices.materials,
    { returnRate: 0, buyMode: settings.buyMode },
  );
  const full = revenue(prices.products.get(fullJournalId(journal.id)), {
    sellMode: settings.sellMode,
    premium: settings.premium,
    undercut: settings.undercut ?? false,
  });
  const emptyCost = empty.status === "complete" ? empty.total : undefined;
  const fullNet = full.status === "missing" ? undefined : full.net;
  return {
    ...journal,
    emptyCost,
    fullNet,
    value:
      emptyCost === undefined || fullNet === undefined
        ? undefined
        : ((journal.fame / journal.capacity) * (fullNet - emptyCost)) /
          amountCrafted,
  };
}
