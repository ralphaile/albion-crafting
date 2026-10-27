import { describe, expect, it } from "vitest";

import { type Filters, MAX_SEARCH_LENGTH, NO_FILTERS } from "./filters";
import { filtersFromSearch, searchWithFilters } from "./filters-url";

const everyFilter: Filters = {
  tiers: [6, 7],
  enchants: [0, 1],
  categories: ["bow", "sword", "leather_shoes", "plate_helmet", "shieldtype"],
  artifacts: "exclude",
  minProfit: -500,
  minMarginPercent: 15,
  hideIncomplete: true,
  specialtyOnly: true,
  search: "clarent, blade",
};

describe("searchWithFilters", () => {
  it("writes nothing with no filters", () => {
    expect(searchWithFilters("", NO_FILTERS)).toBe("");
  });

  it("writes a short, readable link", () => {
    expect(
      searchWithFilters("", { ...NO_FILTERS, tiers: [6, 7], minProfit: 10000 }),
    ).toBe("?tier=6,7&profit=10000");
  });

  it("keeps other parameters and replaces old filters", () => {
    expect(
      searchWithFilters("?server=west&tier=4", { ...NO_FILTERS, tiers: [5] }),
    ).toBe("?server=west&tier=5");
  });
});

describe("filtersFromSearch", () => {
  it("reads back every filter it wrote", () => {
    expect(filtersFromSearch(searchWithFilters("", everyFilter))).toEqual(
      everyFilter,
    );
  });

  it("is undefined when the link has no filters", () => {
    expect(filtersFromSearch("?server=west")).toBeUndefined();
  });

  it("drops values it doesn't know, and keeps the rest", () => {
    expect(
      filtersFromSearch(
        "?tier=3,6,9,6,x&enchant=-1&cat=plate_helmet,__proto__,constructor,sword&artifacts=all",
      ),
    ).toEqual({
      ...NO_FILTERS,
      tiers: [6],
      categories: ["sword", "plate_helmet"],
    });
  });

  it.each([
    ["text", "profit=lots"],
    ["a fraction", "profit=10.5"],
    ["a huge number", "profit=1e400"],
    ["an empty value", "profit="],
    ["more than a billion", "profit=1000000001"],
  ])("ignores a minimum profit that's %s", (_case, search) => {
    expect(filtersFromSearch(`?${search}`)?.minProfit).toBeUndefined();
  });

  it("ignores a minimum margin below −100%", () => {
    expect(filtersFromSearch("?margin=-101")?.minMarginPercent).toBeUndefined();
    expect(filtersFromSearch("?margin=-100")?.minMarginPercent).toBe(-100);
  });

  it("cuts a long name search short", () => {
    const search = filtersFromSearch(`?q=${"a".repeat(5000)}`)?.search;

    expect(search).toHaveLength(MAX_SEARCH_LENGTH);
  });

  it("keeps markup in a name search as plain text", () => {
    expect(
      filtersFromSearch("?q=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E")?.search,
    ).toBe("<img src=x onerror=alert(1)>");
  });
});
