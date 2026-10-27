import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { EvaluateSettings } from "@aoc/core";
import { type GameRecipe, recipes } from "@aoc/crafting-data";
import type { ItemPrices, ObservedPrice } from "@aoc/market-prices";

import { type Craft, type CraftPrices, evaluateCrafts } from "./best-crafts";
import { CraftsTable } from "./CraftsTable";
import { formatPercent, formatSilver, formatSilverPerFocus } from "./format";
import { DEFAULT_ROUTE } from "./route";
import { DEFAULT_SETTINGS } from "./settings";

function recipe(itemId: string): GameRecipe {
  const found = recipes.find((candidate) => candidate.itemId === itemId);
  if (found === undefined) {
    throw new Error(`No recipe for ${itemId}`);
  }
  return found;
}

function seen(value: number, ageMinutes: number): ObservedPrice {
  return {
    status: ageMinutes > 12 * 60 ? "stale" : "fresh",
    value,
    observedAt: 0,
    ageMinutes,
  };
}

function sellsAt(itemId: string, price: ObservedPrice): ItemPrices {
  return {
    itemId,
    marketId: "Lymhurst",
    quality: 1,
    sellMin: price,
    buyMax: { status: "missing" },
  };
}

const lymhurstPrices: CraftPrices = {
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
    expect(screen.getByText(/ranked by/)).toHaveTextContent(
      "2 crafts ranked by silver per focus · 1 craft missing prices",
    );
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
    expect(screen.getByText(/ranked by/)).toHaveTextContent(
      "ranked by profit per craft",
    );
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

  it("puts only the rows near the screen on the page", () => {
    renderTable(
      evaluateCrafts(recipes, DEFAULT_ROUTE.place, DEFAULT_SETTINGS, {
        materials: [],
        products: [],
      }),
    );

    expect(screen.getByRole("table")).toHaveAttribute(
      "aria-rowcount",
      String(recipes.length + 2),
    );
    expect(screen.getAllByRole("rowheader").length).toBeLessThan(50);
  });

  it("says when there's nothing to rank", () => {
    renderTable([]);

    expect(screen.getByText("Nothing to rank")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
