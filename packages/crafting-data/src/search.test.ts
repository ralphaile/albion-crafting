import { describe, expect, it } from "vitest";

import { search, type SearchEntry, searchText } from "./search.js";

const index: SearchEntry[] = [
  "Expert's Broadsword 5.0 T5_MAIN_SWORD",
  "Expert's Broadsword 5.1 T5_MAIN_SWORD@1",
  "Expert's Claymore 5.0 T5_2H_CLAYMORE",
  "Adept's Royal Cowl 4.0 T4_HEAD_CLOTH_ROYAL",
].map((text) => ({ id: text.split(" ").at(-1)!, text: searchText(text) }));

describe("search", () => {
  it.each([
    [
      "ignores case",
      "EXPERT'S BROADSWORD",
      ["T5_MAIN_SWORD", "T5_MAIN_SWORD@1"],
    ],
    ["matches part of a word", "broad", ["T5_MAIN_SWORD", "T5_MAIN_SWORD@1"]],
    [
      "matches the middle of a word",
      "sword",
      ["T5_MAIN_SWORD", "T5_MAIN_SWORD@1"],
    ],
    ["needs every word, in any order", "5.1 broad", ["T5_MAIN_SWORD@1"]],
    ["ignores apostrophes", "experts clay", ["T5_2H_CLAYMORE"]],
    ["finds an ID", "t4_head", ["T4_HEAD_CLOTH_ROYAL"]],
    ["ignores extra spaces", "  royal   cowl ", ["T4_HEAD_CLOTH_ROYAL"]],
    ["finds nothing for a word no item has", "broad bow", []],
  ])("%s", (_, query, ids) => {
    expect(search(index, query)).toEqual(ids);
  });

  it("finds nothing for an empty query", () => {
    expect(search(index, "   ")).toEqual([]);
  });
});
