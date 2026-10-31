import { describe, expect, it } from "vitest";

import { searchWithShownItem, shownItemFromSearch } from "./craft-url.helpers";

describe("shownItemFromSearch", () => {
  it("reads the craft a link opens", () => {
    expect(shownItemFromSearch("?tier=4&item=T4_MAIN_SWORD")).toBe(
      "T4_MAIN_SWORD",
    );
  });

  it.each(["", "?tier=4", "?item="])("opens nothing for %j", (search) => {
    expect(shownItemFromSearch(search)).toBeUndefined();
  });
});

describe("searchWithShownItem", () => {
  it("adds the open craft and keeps the other parameters", () => {
    expect(searchWithShownItem("?tier=4", "T4_MAIN_SWORD@1")).toBe(
      "?tier=4&item=T4_MAIN_SWORD%401",
    );
  });

  it("reads back what it writes", () => {
    expect(
      shownItemFromSearch(searchWithShownItem("?tier=4", "T4_MAIN_SWORD@1")),
    ).toBe("T4_MAIN_SWORD@1");
  });

  it("removes the craft once it's closed", () => {
    expect(searchWithShownItem("?tier=4&item=T4_MAIN_SWORD", undefined)).toBe(
      "?tier=4",
    );
    expect(searchWithShownItem("?item=T4_MAIN_SWORD", undefined)).toBe("");
  });
});
