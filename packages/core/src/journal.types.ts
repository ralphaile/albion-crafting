// The laborer's journal a recipe's crafting fame fills, such as
// T5_JOURNAL_WARRIOR, and how much fame one craft puts in it. The market sells
// it as `${id}_EMPTY` and `${id}_FULL`.
export interface RecipeJournal {
  id: string;
  capacity: number;
  fame: number;
}

// What filling the journal adds to each item crafted: the share of a journal
// one craft fills, times what a full one sells for less what an empty one
// costs. `value` is unknown while either price is.
export interface JournalValue extends RecipeJournal {
  emptyCost: number | undefined;
  fullNet: number | undefined;
  value: number | undefined;
}
