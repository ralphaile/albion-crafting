import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { EvaluateSettings } from "@aoc/core";
import { type GameRecipe, recipes } from "@aoc/crafting-data";

import { evaluateCrafts } from "./best-crafts.helpers";
import type {
  Craft,
  UsedItemPrices,
  UsedPrice,
  UsedPrices,
} from "./best-crafts.types";
import { CraftsTable, PAGE_SIZE } from "./CraftsTable";
import {
  formatCount,
  formatPercent,
  formatSilver,
  formatSilverPerFocus,
} from "./format.helpers";
import { DEFAULT_ROUTE } from "./route.constants";
import { DEFAULT_SETTINGS } from "./settings.constants";

function recipe(itemId: string): GameRecipe {
  const found = recipes.find((candidate) => candidate.itemId === itemId);
  if (found === undefined) {
    throw new Error(`No recipe for ${itemId}`);
  }
  return found;
}

function seen(value: number, ageMinutes: number): UsedPrice {
  return {
    status: ageMinutes > 12 * 60 ? "stale" : "fresh",
    value,
    observedAt: 0,
    ageMinutes,
    origin: "api",
  };
}

function sellsAt(itemId: string, price: UsedPrice): UsedItemPrices {
  return {
    itemId,
    marketId: "Lymhurst",
    quality: 1,
    sellMin: price,
    buyMax: { status: "missing", origin: "api" },
  };
}

const lymhurstPrices: UsedPrices = {
  materials: [
    sellsAt("T4_METALBAR", seen(100, 20)),
    sellsAt("T4_LEATHER", seen(50, 14 * 60)),
    sellsAt("T4_PLANKS", seen(60, 45)),
  ],
  products: [
    sellsAt("T4_MAIN_SWORD", seen(5000, 30)),
    sellsAt("T4_MAIN_AXE", seen(1200, 90)),
  ],
};

function craftsFor(settings: EvaluateSettings) {
  return evaluateCrafts(
    ["T4_MAIN_SWORD", "T4_MAIN_AXE", "T4_2H_BOW"].map(recipe),
    DEFAULT_ROUTE.place,
    settings,
    lymhurstPrices,
  );
}

const crafts = craftsFor(DEFAULT_SETTINGS);

function craft(itemId: string) {
  const found = crafts.find((candidate) => candidate.itemId === itemId);
  if (found?.status !== "complete") {
    throw new Error(`${itemId} isn't complete`);
  }
  return found;
}

const unpriced = evaluateCrafts(
  recipes,
  DEFAULT_ROUTE.place,
  DEFAULT_SETTINGS,
  {
    materials: [],
    products: [],
  },
);

function rangeShown() {
  return screen.getByText(/^Crafts /).textContent;
}

function renderTable(given: readonly Craft[] = crafts, focus = true) {
  render(<CraftsTable crafts={given} focus={focus} />);
}

function itemsInOrder() {
  return screen
    .getAllByRole("rowheader")
    .map((header) => within(header).getByTitle(/\d\.\d$/).title);
}

function rowOf(name: string) {
  const row = screen.getByTitle(name).closest("tr");
  if (row === null) {
    throw new Error(`No row for ${name}`);
  }
  return within(row);
}

describe("CraftsTable", () => {
  it("ranks the crafts with every price by silver per focus when focus is on, and the rest after them", () => {
    renderTable();

    expect(itemsInOrder()).toEqual([
      "Adept's Battleaxe 4.0",
      "Adept's Broadsword 4.0",
      "Adept's Bow 4.0",
    ]);
    expect(
      screen.getByRole("columnheader", { name: "Silver/focus" }),
    ).toHaveAttribute("aria-sort", "descending");
    expect(screen.getByText("Missing prices · 1 craft")).toBeInTheDocument();
  });

  it("ranks by the column clicked", () => {
    renderTable();

    fireEvent.click(screen.getByRole("button", { name: "Profit" }));

    expect(itemsInOrder()).toEqual([
      "Adept's Broadsword 4.0",
      "Adept's Battleaxe 4.0",
      "Adept's Bow 4.0",
    ]);
    expect(
      screen.getByRole("columnheader", { name: "Profit" }),
    ).toHaveAttribute("aria-sort", "descending");
    expect(
      screen.getByRole("columnheader", { name: "Silver/focus" }),
    ).not.toHaveAttribute("aria-sort");
  });

  it("ranks lowest first when the sorted column is clicked again, and back", () => {
    renderTable();
    const silverPerFocus = () =>
      screen.getByRole("columnheader", { name: "Silver/focus" });

    fireEvent.click(screen.getByRole("button", { name: "Silver/focus" }));

    expect(itemsInOrder()).toEqual([
      "Adept's Broadsword 4.0",
      "Adept's Battleaxe 4.0",
      "Adept's Bow 4.0",
    ]);
    expect(silverPerFocus()).toHaveAttribute("aria-sort", "ascending");

    fireEvent.click(screen.getByRole("button", { name: "Silver/focus" }));

    expect(silverPerFocus()).toHaveAttribute("aria-sort", "descending");
    expect(itemsInOrder()[0]).toBe("Adept's Battleaxe 4.0");
  });

  it("shows a craft's profit, margin, silver per focus, costs and return rate", () => {
    renderTable();
    const broadsword = craft("T4_MAIN_SWORD");
    const row = rowOf("Adept's Broadsword 4.0");

    for (const text of [
      formatSilver(broadsword.profit),
      formatPercent(broadsword.margin ?? Number.NaN),
      formatSilverPerFocus(broadsword.silverPerFocus ?? Number.NaN),
      formatSilver(
        broadsword.materialCost.status === "complete"
          ? broadsword.materialCost.total
          : Number.NaN,
      ),
      formatSilver(
        broadsword.revenue.status === "missing"
          ? Number.NaN
          : broadsword.revenue.net,
      ),
      "47.9%",
    ]) {
      expect(row.getByText(text)).toBeInTheDocument();
    }
  });

  it("shows a loss with a minus sign", () => {
    renderTable();
    const loss = formatSilver(craft("T4_MAIN_AXE").profit);

    expect(loss).toMatch(/^\u2212\d/);
    expect(rowOf("Adept's Battleaxe 4.0").getByText(loss)).toBeInTheDocument();
  });

  it("marks the items the crafting location gives its specialty bonus", () => {
    renderTable();

    expect(
      rowOf("Adept's Broadsword 4.0").getByText("Specialty"),
    ).toBeInTheDocument();
    expect(rowOf("Adept's Bow 4.0").getByText("Specialty")).toBeInTheDocument();
    expect(
      rowOf("Adept's Battleaxe 4.0").queryByText("Specialty"),
    ).not.toBeInTheDocument();
  });

  it("shows how old the item's price and the oldest material price are, and which are stale", () => {
    renderTable();
    const row = rowOf("Adept's Broadsword 4.0");

    expect(row.getByTitle("item price seen 30 min ago")).toHaveTextContent(
      "item 30 min",
    );
    expect(
      row.getByTitle("materials price seen 14 h ago, stale"),
    ).toHaveTextContent("materials 14 h, stale");
  });

  it("colors a price's dot by its age, and nothing else", () => {
    renderTable();
    const row = rowOf("Adept's Broadsword 4.0");

    expect(row.getByTitle("item price seen 30 min ago")).toHaveAttribute(
      "data-age",
      "recent",
    );
    expect(
      row.getByTitle("materials price seen 14 h ago, stale"),
    ).toHaveAttribute("data-age", "old");
  });

  it("says how many prices a craft is missing", () => {
    renderTable();
    const row = rowOf("Adept's Bow 4.0");

    expect(row.getByText("1 price missing")).toBeInTheDocument();
    expect(row.getAllByText("—").length).toBeGreaterThanOrEqual(3);
  });

  it("leaves out silver per focus without focus, and ranks by profit", () => {
    renderTable(craftsFor({ ...DEFAULT_SETTINGS, focus: false }), false);

    expect(
      screen.queryByRole("columnheader", { name: "Silver/focus" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Profit" }),
    ).toHaveAttribute("aria-sort", "descending");
  });

  it("shows 50 crafts a page, and moves between pages", () => {
    renderTable(unpriced);
    const total = formatCount(recipes.length);

    expect(screen.getAllByRole("rowheader")).toHaveLength(PAGE_SIZE);
    expect(screen.getByRole("table")).toHaveAttribute(
      "aria-rowcount",
      String(recipes.length + 2),
    );
    expect(rangeShown()).toBe(`Crafts 1–50 of ${total}`);
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(rangeShown()).toBe(`Crafts 51–100 of ${total}`);
    expect(screen.getByRole("button", { name: "Page 2" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getAllByRole("rowheader")[0]?.closest("tr")).toHaveAttribute(
      "aria-rowindex",
      "53",
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: `Page ${formatCount(Math.ceil(recipes.length / PAGE_SIZE))}`,
      }),
    );

    expect(rangeShown()).toMatch(new RegExp(`–${total} of ${total}$`));
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("goes back to the first page when the sort changes", () => {
    renderTable(unpriced);

    fireEvent.click(screen.getByRole("button", { name: "Page 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Margin" }));

    expect(rangeShown()).toMatch(/^Crafts 1–50 of/);
  });

  it("has no pages when every craft fits on one", () => {
    renderTable();

    expect(
      screen.queryByRole("navigation", { name: "Pages" }),
    ).not.toBeInTheDocument();
  });

  it("says when there's nothing to rank", () => {
    renderTable([]);

    expect(screen.getByText("Nothing to rank")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
