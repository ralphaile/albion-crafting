import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import type { ItemPrices, MarketData } from "@aoc/market-prices";

import { NO_PLAN } from "./plan.constants";
import type { CraftingPlan } from "./plan.types";
import { PlanPage } from "./PlanPage";
import { DEFAULT_ROUTE_CHOICE } from "./route.constants";
import { DEFAULT_SETTINGS } from "./settings.constants";
import type { CraftingSettings } from "./settings.types";
import { NO_SPECIALIZATIONS } from "./specializations.constants";
import { fakeMarketData } from "../test/fake-market-data";

const BROADSWORD = "Adept's Broadsword 4.0";

function lymhurst(itemId: string, value: number): ItemPrices {
  return {
    itemId,
    marketId: "Lymhurst",
    quality: 1,
    sellMin: { status: "fresh", value, observedAt: 0, ageMinutes: 30 },
    buyMax: { status: "missing" },
  };
}

function answering(prices: readonly ItemPrices[]) {
  const getPrices = vi.fn<MarketData["getPrices"]>((itemIds) =>
    Promise.resolve({
      prices: prices.filter(({ itemId }) => itemIds.includes(itemId)),
      failures: [],
      fetchedAt: 0,
    }),
  );
  return { ...fakeMarketData(), getPrices };
}

const broadswordPrices = [
  lymhurst("T4_METALBAR", 100),
  lymhurst("T4_LEATHER", 50),
  lymhurst("T4_MAIN_SWORD", 5000),
];

function Harness({
  marketData,
  initial,
  settings,
}: {
  marketData: MarketData;
  initial: CraftingPlan;
  settings: CraftingSettings;
}) {
  const [plan, setPlan] = useState(initial);
  return (
    <PlanPage
      marketData={marketData}
      plan={plan}
      onChange={setPlan}
      route={DEFAULT_ROUTE_CHOICE}
      settings={settings}
      manualPrices={[]}
      specializations={NO_SPECIALIZATIONS}
    />
  );
}

function renderPlan(
  marketData: MarketData = answering(broadswordPrices),
  initial: CraftingPlan = NO_PLAN,
  settings: CraftingSettings = DEFAULT_SETTINGS,
) {
  render(
    <Harness marketData={marketData} initial={initial} settings={settings} />,
  );
}

function addBroadsword(location: HTMLElement) {
  fireEvent.change(within(location).getByLabelText("Add an item"), {
    target: { value: "broadsword" },
  });
  fireEvent.click(
    within(location).getByRole("button", { name: `Add ${BROADSWORD}` }),
  );
}

function total(name: string, term: string) {
  const list = screen.getByLabelText(name);
  const terms = within(list).getAllByRole("term");
  const index = terms.findIndex((dt) => dt.textContent === term);
  return within(list).getAllByRole("definition")[index]?.textContent;
}

describe("PlanPage", () => {
  it("adds a location and an item, and shows its materials, focus and profit with the totals", async () => {
    renderPlan();

    fireEvent.click(screen.getByRole("button", { name: "Add location" }));
    const location = screen.getByRole("region", { name: "Location 1" });
    addBroadsword(location);

    const materials = await within(location).findByRole("list", {
      name: `Materials for ${BROADSWORD}`,
    });
    expect(materials).toHaveTextContent("Steel Bar 4.0");
    expect(materials).toHaveTextContent("Worked Leather 4.0");
    const row = within(location).getByRole("row", {
      name: new RegExp(BROADSWORD),
    });
    expect(row).toHaveTextContent("1,286");
    expect(total("Location 1 totals", "Focus")).toBe("1,286");
    expect(total("Plan totals", "Profit")).toBe(
      total("Location 1 totals", "Profit"),
    );
  });

  it("recounts an entry when its quantity or focus changes", async () => {
    renderPlan();
    fireEvent.click(screen.getByRole("button", { name: "Add location" }));
    addBroadsword(screen.getByRole("region", { name: "Location 1" }));
    await screen.findByRole("list", { name: `Materials for ${BROADSWORD}` });

    fireEvent.change(screen.getByLabelText(`Quantity of ${BROADSWORD}`), {
      target: { value: "3" },
    });
    expect(total("Plan totals", "Focus")).toBe("3,858");

    fireEvent.click(screen.getByLabelText(`Use focus for ${BROADSWORD}`));
    expect(total("Plan totals", "Focus")).toBe("0");
  });

  it("changes an entry's enchantment, and removes entries and locations", async () => {
    renderPlan();
    fireEvent.click(screen.getByRole("button", { name: "Add location" }));
    addBroadsword(screen.getByRole("region", { name: "Location 1" }));
    await screen.findByRole("list", { name: `Materials for ${BROADSWORD}` });

    fireEvent.change(screen.getByLabelText(`Enchantment of ${BROADSWORD}`), {
      target: { value: "T4_MAIN_SWORD@1" },
    });
    expect(
      screen.getByRole("rowheader", { name: "Adept's Broadsword 4.1" }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Remove Adept's Broadsword 4.1" }),
    );
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove location 1" }));
    expect(
      screen.queryByRole("region", { name: "Location 1" }),
    ).not.toBeInTheDocument();
  });

  it("says which prices an entry is missing once they've loaded, and marks the totals", async () => {
    renderPlan(answering([lymhurst("T4_MAIN_SWORD", 5000)]));
    fireEvent.click(screen.getByRole("button", { name: "Add location" }));
    addBroadsword(screen.getByRole("region", { name: "Location 1" }));
    expect(screen.getByText("Loading prices…")).toBeInTheDocument();

    expect(
      await screen.findByText("Missing: Steel Bar 4.0, Worked Leather 4.0"),
    ).toBeInTheDocument();
    expect(total("Plan totals", "Missing prices")).toBe(
      "Steel Bar 4.0, Worked Leather 4.0",
    );
  });

  it("asks each market once for everything the plan needs there", async () => {
    const marketData = answering(broadswordPrices);
    const { getPrices } = marketData;
    renderPlan(marketData, {
      locations: [
        {
          id: "city",
          route: DEFAULT_ROUTE_CHOICE,
          entries: [
            {
              id: "a",
              itemId: "T4_MAIN_SWORD",
              alternative: 0,
              quantity: 1,
              focus: true,
              dailyBonus: 0,
            },
          ],
        },
        {
          id: "hideout",
          route: {
            place: { kind: "hideout", biomeId: "FOREST", quality: 6, level: 9 },
            buyMarketId: "Lymhurst",
            sellMarketId: "Lymhurst",
          },
          entries: [
            {
              id: "b",
              itemId: "T4_MAIN_SWORD",
              alternative: 0,
              quantity: 5,
              focus: false,
              dailyBonus: 0.2,
            },
          ],
        },
      ],
    });

    await screen.findAllByRole("list", { name: `Materials for ${BROADSWORD}` });
    expect(getPrices).toHaveBeenCalledTimes(1);
    expect(getPrices.mock.calls[0]?.slice(0, 2)).toEqual([
      ["T4_LEATHER", "T4_MAIN_SWORD", "T4_METALBAR"],
      ["Lymhurst"],
    ]);
  });

  it("lists what to buy in each market, and copies it as text", async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>(() =>
      Promise.resolve(),
    );
    // jsdom has no clipboard.
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    renderPlan();
    fireEvent.click(screen.getByRole("button", { name: "Add location" }));
    addBroadsword(screen.getByRole("region", { name: "Location 1" }));

    const list = await screen.findByRole("region", { name: "Shopping list" });
    const lymhurst = within(list).getByRole("table", { name: "Lymhurst" });
    expect(
      within(lymhurst)
        .getAllByRole("rowheader")
        .map(({ textContent }) => textContent),
    ).toEqual(["Steel Bar 4.0", "Worked Leather 4.0", "Total"]);

    fireEvent.click(within(list).getByRole("button", { name: "Copy as text" }));

    expect(
      await within(list).findByRole("button", { name: "Copied" }),
    ).toBeInTheDocument();
    expect(writeText.mock.calls[0]?.[0]).toMatch(
      /^Lymhurst\n {2}\d+ × Steel Bar 4\.0 at 100 = /,
    );
  });

  it("uses an item's 7-day average when its price is an outlier and Settings says to", async () => {
    const marketData = {
      ...answering(broadswordPrices),
      getHistory: vi.fn<MarketData["getHistory"]>(() =>
        Promise.resolve({
          history: [
            {
              itemId: "T4_MAIN_SWORD",
              marketId: "Lymhurst",
              quality: 1,
              averagePrice: 500,
              averageDailyVolume: 10,
              newestDay: 0,
            },
          ],
          failures: [],
          fetchedAt: 0,
        }),
      ),
    };
    const plan: CraftingPlan = {
      locations: [
        {
          id: "city",
          route: DEFAULT_ROUTE_CHOICE,
          entries: [
            {
              id: "a",
              itemId: "T4_MAIN_SWORD",
              alternative: 0,
              quantity: 1,
              focus: true,
              dailyBonus: 0,
            },
          ],
        },
      ],
    };
    renderPlan(marketData, plan, {
      ...DEFAULT_SETTINGS,
      useAverageForOutliers: true,
    });

    await screen.findByRole("list", { name: `Materials for ${BROADSWORD}` });
    expect(total("Plan totals", "Profit")).toMatch(/^−/);
  });
});
