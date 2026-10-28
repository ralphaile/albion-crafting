import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { recipes, searchItems } from "@aoc/crafting-data";
import type {
  ItemPrices,
  MarketData,
  ObservedPrice,
  PricesResult,
} from "@aoc/market-prices";

import { BestCrafts } from "./BestCrafts";
import { NO_FILTERS } from "./filters.constants";
import type { Filters } from "./filters.types";
import { formatCount } from "./format.helpers";
import { DEFAULT_ROUTE } from "./route.constants";
import type { Route } from "./route.types";
import { DEFAULT_SETTINGS } from "./settings.constants";
import type { CraftingSettings } from "./settings.types";
import { fakeMarketData, noPrices } from "../test/fake-market-data";

const route: Route = {
  place: DEFAULT_ROUTE.place,
  buyMarketId: "Martlock",
  sellMarketId: "Caerleon",
};

function fresh(value: number): ObservedPrice {
  return { status: "fresh", value, observedAt: 0, ageMinutes: 30 };
}

function priced(itemId: string, marketId: string, value: number): ItemPrices {
  return {
    itemId,
    marketId,
    quality: 1,
    sellMin: fresh(value),
    buyMax: fresh(value * 0.9),
  };
}

function result(prices: ItemPrices[]): PricesResult {
  return { prices, failures: [], fetchedAt: 0 };
}

const broadswordPrices = (marketIds: readonly string[]) =>
  Promise.resolve(
    marketIds[0] === "Martlock"
      ? result([
          priced("T4_METALBAR", "Martlock", 100),
          priced("T4_LEATHER", "Martlock", 50),
        ])
      : result([priced("T4_MAIN_SWORD", "Caerleon", 5000)]),
  );

function renderBestCrafts(getPrices: MarketData["getPrices"]) {
  const marketData = fakeMarketData({ getPrices });
  render(
    <BestCrafts
      marketData={marketData}
      route={route}
      settings={DEFAULT_SETTINGS}
    />,
  );
  return marketData;
}

function bestCrafts() {
  return screen.findByRole("region", { name: "Best crafts" });
}

function missingPrices(count: number) {
  return screen.findByText(`Missing prices · ${formatCount(count)} crafts`);
}

describe("BestCrafts", () => {
  it("asks for the materials where it buys and the items where it sells, at quality 1", async () => {
    const getPrices = vi.fn<MarketData["getPrices"]>((_itemIds, marketIds) =>
      broadswordPrices(marketIds),
    );
    renderBestCrafts(getPrices);

    await bestCrafts();

    expect(getPrices).toHaveBeenCalledTimes(2);
    expect(getPrices).toHaveBeenCalledWith(
      expect.arrayContaining(["T4_METALBAR", "T4_LEATHER"]),
      ["Martlock"],
      [1],
      { region: "west", staleAfterMinutes: 12 * 60 },
    );
    expect(getPrices).toHaveBeenCalledWith(
      expect.arrayContaining(["T4_MAIN_SWORD"]),
      ["Caerleon"],
      [1],
      { region: "west", staleAfterMinutes: 12 * 60 },
    );
  });

  it("asks again for a new server or stale time, and re-prices other settings without asking", async () => {
    const getPrices = vi.fn<MarketData["getPrices"]>((_itemIds, marketIds) =>
      broadswordPrices(marketIds),
    );
    const marketData = fakeMarketData({ getPrices });
    const withSettings = (settings: CraftingSettings) => (
      <BestCrafts marketData={marketData} route={route} settings={settings} />
    );
    const { rerender } = render(withSettings(DEFAULT_SETTINGS));
    await bestCrafts();
    expect(getPrices).toHaveBeenCalledTimes(2);

    rerender(withSettings({ ...DEFAULT_SETTINGS, focus: false }));

    expect(
      screen.queryByRole("columnheader", { name: "Silver/focus" }),
    ).not.toBeInTheDocument();
    expect(getPrices).toHaveBeenCalledTimes(2);

    rerender(withSettings({ ...DEFAULT_SETTINGS, server: "europe" }));

    await waitFor(() => {
      expect(getPrices).toHaveBeenCalledTimes(4);
    });
    expect(getPrices).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.anything(),
      [1],
      { region: "europe", staleAfterMinutes: 12 * 60 },
    );

    rerender(
      withSettings({
        ...DEFAULT_SETTINGS,
        server: "europe",
        staleAfterHours: 2,
      }),
    );

    await waitFor(() => {
      expect(getPrices).toHaveBeenCalledTimes(6);
    });
    expect(getPrices).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.anything(),
      [1],
      { region: "europe", staleAfterMinutes: 2 * 60 },
    );
  });

  it("says it's fetching prices until they arrive", async () => {
    const answers: ((result: PricesResult) => void)[] = [];
    renderBestCrafts(
      () =>
        new Promise((resolve) => {
          answers.push(resolve);
        }),
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Fetching market prices…",
    );

    for (const answer of answers) {
      answer(noPrices);
    }

    await bestCrafts();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("counts the crafts that have every price", async () => {
    renderBestCrafts((_itemIds, marketIds) => broadswordPrices(marketIds));

    expect(await missingPrices(recipes.length - 1)).toBeInTheDocument();
  });

  it("uses the prices it has when only some batches fail", async () => {
    renderBestCrafts(async (itemIds, marketIds) => ({
      ...(await broadswordPrices(marketIds)),
      failures: [{ itemIds: [...itemIds], error: new Error("AODP is down") }],
    }));

    expect(await missingPrices(recipes.length - 1)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("says what went wrong when no prices could be fetched, and tries again when asked", async () => {
    const getPrices = vi
      .fn<MarketData["getPrices"]>((_itemIds, marketIds) =>
        broadswordPrices(marketIds),
      )
      .mockResolvedValueOnce({
        ...noPrices,
        failures: [{ itemIds: ["T4_METALBAR"], error: new Error("AODP: 503") }],
      })
      .mockResolvedValueOnce(noPrices);
    renderBestCrafts(getPrices);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "Couldn’t fetch prices from the Albion Online Data Project.",
    );
    expect(alert).toHaveTextContent("AODP: 503");

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await missingPrices(recipes.length - 1)).toBeInTheDocument();
    expect(getPrices).toHaveBeenCalledTimes(4);
  });

  it("says what went wrong when fetching prices fails outright", async () => {
    renderBestCrafts(() => Promise.reject(new Error("Failed to fetch")));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Failed to fetch",
    );
  });
});

function Filtered({
  getPrices,
  initial,
}: {
  getPrices: MarketData["getPrices"];
  initial: Filters;
}) {
  const [filters, setFilters] = useState(initial);
  const [marketData] = useState(() => fakeMarketData({ getPrices }));
  return (
    <BestCrafts
      marketData={marketData}
      route={route}
      settings={DEFAULT_SETTINGS}
      filters={filters}
      onFiltersChange={setFilters}
    />
  );
}

function renderFiltered(initial: Partial<Filters>) {
  const getPrices = vi.fn<MarketData["getPrices"]>((_itemIds, marketIds) =>
    broadswordPrices(marketIds),
  );
  render(
    <Filtered getPrices={getPrices} initial={{ ...NO_FILTERS, ...initial }} />,
  );
  return getPrices;
}

const swords: Partial<Filters> = { categories: ["sword"] };

function askedFor(getPrices: ReturnType<typeof renderFiltered>, call = 1) {
  const [itemIds = []] = getPrices.mock.calls[call] ?? [];
  return itemIds;
}

function categoryButton() {
  return screen.getByRole("button", { name: /^Category/ });
}

describe("BestCrafts with filters", () => {
  it("asks only for the items that pass the filters", async () => {
    const getPrices = renderFiltered({
      ...swords,
      tiers: [4],
      enchants: [0],
      artifacts: "exclude",
    });
    await bestCrafts();

    const expected = recipes
      .filter(
        (recipe) =>
          recipe.shopSubcategory === "sword" &&
          recipe.tier === 4 &&
          recipe.enchant === 0 &&
          !recipe.isArtifact,
      )
      .map(({ itemId }) => itemId);
    expect(expected.length).toBeGreaterThan(0);
    expect([...askedFor(getPrices)].sort()).toEqual(expected.sort());
  });

  it("asks AODP nothing when no recipe passes", async () => {
    const getPrices = renderFiltered({ search: "no such item anywhere" });

    expect(
      await screen.findByText("No crafts match your filters"),
    ).toBeInTheDocument();
    expect(getPrices).not.toHaveBeenCalled();
  });

  it("asks again only when the filters let new items in", async () => {
    const getPrices = renderFiltered(swords);
    await bestCrafts();
    expect(getPrices).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole("button", { name: "T4" }));
    await screen.findByRole("button", { name: "Remove filter: Tier 4" });
    expect(getPrices).toHaveBeenCalledTimes(2);

    fireEvent.click(categoryButton());
    fireEvent.click(screen.getByRole("checkbox", { name: "Bow" }));
    await waitFor(() => {
      expect(getPrices).toHaveBeenCalledTimes(4);
    });
    expect(askedFor(getPrices, 3)).toContain("T4_2H_BOW");
  });

  it("doesn't ask again when a minimum changes", async () => {
    const getPrices = renderFiltered(swords);
    await bestCrafts();

    fireEvent.change(screen.getByRole("spinbutton", { name: "Min profit" }), {
      target: { value: "1000" },
    });

    expect(
      await screen.findByRole("button", {
        name: "Remove filter: Profit ≥ 1,000",
      }),
    ).toBeInTheDocument();
    expect(getPrices).toHaveBeenCalledTimes(2);
  });

  it("hides crafts below a minimum, and says so when none are left", async () => {
    renderFiltered({ ...swords, hideIncomplete: true });
    expect(within(await bestCrafts()).getAllByRole("rowheader")).toHaveLength(
      1,
    );

    fireEvent.change(screen.getByRole("spinbutton", { name: "Min profit" }), {
      target: { value: "1000000" },
    });

    expect(
      await screen.findByText("No crafts match your filters"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear all filters" }));

    expect(await missingPrices(recipes.length - 1)).toBeInTheDocument();
  });

  it("removes a filter with its chip, and all of them with Clear all", async () => {
    renderFiltered({ ...swords, tiers: [4, 5], specialtyOnly: true });
    await bestCrafts();
    const chips = () =>
      within(screen.getByRole("list", { name: "Active filters" }))
        .getAllByRole("button")
        .map((chip) => chip.textContent);

    expect(chips()).toEqual(["Tier 4", "Tier 5", "Sword", "Specialty only"]);

    fireEvent.click(
      screen.getByRole("button", { name: "Remove filter: Tier 5" }),
    );
    expect(chips()).toEqual(["Tier 4", "Sword", "Specialty only"]);
    expect(screen.getByRole("button", { name: "T5" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(
      screen.queryByRole("list", { name: "Active filters" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "Specialty only" }),
    ).not.toBeChecked();
  });

  it("picks any mix of armor pieces, and a whole material or slot at once", async () => {
    renderFiltered({});
    await bestCrafts();
    const chips = () =>
      within(screen.getByRole("list", { name: "Active filters" }))
        .getAllByRole("button")
        .map((chip) => chip.textContent);

    fireEvent.click(categoryButton());
    fireEvent.click(screen.getByRole("checkbox", { name: "Plate helmet" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Leather shoes" }));
    expect(chips()).toEqual(["Leather shoes", "Plate helmet"]);

    fireEvent.click(screen.getByRole("button", { name: "Plate, whole row" }));
    expect(chips()).toEqual([
      "Leather shoes",
      "Plate helmet",
      "Plate armor",
      "Plate shoes",
    ]);
    expect(
      screen.getByRole("button", { name: "Plate, whole row" }),
    ).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(
      screen.getByRole("button", { name: "Shoes, whole column" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Shoes, whole column" }),
    );
    expect(chips()).toEqual(["Plate helmet", "Plate armor"]);
  });

  it("picks categories from a list that closes on Escape or a click outside", async () => {
    renderFiltered({});
    await bestCrafts();

    expect(categoryButton()).toHaveAccessibleName("Category All");
    expect(screen.queryByRole("group", { name: "Category" })).toBeNull();

    fireEvent.click(categoryButton());
    fireEvent.click(screen.getByRole("checkbox", { name: "Sword" }));
    expect(categoryButton()).toHaveAccessibleName("Category Sword");
    fireEvent.click(screen.getByRole("checkbox", { name: "Torch" }));
    expect(categoryButton()).toHaveAccessibleName("Category 2 chosen");

    fireEvent.keyDown(screen.getByRole("checkbox", { name: "Torch" }), {
      key: "Escape",
    });
    expect(screen.queryByRole("group", { name: "Category" })).toBeNull();
    expect(categoryButton()).toHaveFocus();

    fireEvent.click(categoryButton());
    expect(categoryButton()).toHaveAttribute("aria-expanded", "true");
    fireEvent.pointerDown(document.body);
    expect(categoryButton()).toHaveAttribute("aria-expanded", "false");
  });

  it("filters by name once typing pauses", async () => {
    const getPrices = renderFiltered({});
    await bestCrafts();

    fireEvent.change(
      screen.getByRole("searchbox", { name: "Filter by name" }),
      {
        target: { value: "broadsword" },
      },
    );

    expect(
      await screen.findByRole("button", {
        name: "Remove filter: Name: broadsword",
      }),
    ).toBeInTheDocument();
    expect(
      await missingPrices(searchItems("broadsword").length - 1),
    ).toBeInTheDocument();
    expect(getPrices).toHaveBeenCalledTimes(2);
  });
});
