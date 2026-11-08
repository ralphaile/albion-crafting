import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import type { ItemPrices, MarketData } from "@aoc/market-prices";

import type { ManualPrice } from "./manual-prices.types";
import { everyMaterialIn } from "./material-markets.helpers";
import { NO_PINS } from "./material-pins.constants";
import { pinMaterial } from "./material-pins.helpers";
import type { MaterialPins } from "./material-pins.types";
import type { MissingPrice } from "./missing-prices.types";
import { MissingPricesPanel } from "./MissingPricesPanel";
import { NO_PLAN } from "./plan.constants";
import type { CraftingPlan } from "./plan.types";
import { PlanPage } from "./PlanPage";
import { DEFAULT_ROUTE_CHOICE } from "./route.constants";
import type { RouteChoice } from "./route.types";
import { DEFAULT_SETTINGS } from "./settings.constants";
import type { CraftingSettings } from "./settings.types";
import { NO_SPECIALIZATIONS } from "./specializations.constants";
import { fakeMarketData } from "../test/fake-market-data";

const BROADSWORD = "Adept's Broadsword 4.0";

// Every material in Lymhurst, so the plan asks one market.
const ROUTE: RouteChoice = {
  ...DEFAULT_ROUTE_CHOICE,
  materialMarkets: everyMaterialIn("Lymhurst"),
};

function lymhurst(
  itemId: string,
  value: number,
  marketId = "Lymhurst",
): ItemPrices {
  return {
    itemId,
    marketId,
    quality: 1,
    sellMin: { status: "fresh", value, observedAt: 0, ageMinutes: 30 },
    buyMax: { status: "missing" },
  };
}

function answering(prices: readonly ItemPrices[]) {
  const getPrices = vi.fn<MarketData["getPrices"]>((itemIds, marketIds) =>
    Promise.resolve({
      prices: prices.filter(
        ({ itemId, marketId }) =>
          itemIds.includes(itemId) && marketIds.includes(marketId),
      ),
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
  const [manualPrices, setManualPrices] = useState<ManualPrice[]>([]);
  const [missing, setMissing] = useState<readonly MissingPrice[]>([]);
  const [pins, setPins] = useState<MaterialPins>(NO_PINS);
  return (
    <>
      <MissingPricesPanel
        missingPrices={missing}
        onSave={(price) => {
          setManualPrices((saved) => [...saved, price]);
        }}
        onRemove={() => undefined}
      />
      <PlanPage
        marketData={marketData}
        plan={plan}
        onChange={setPlan}
        route={ROUTE}
        settings={settings}
        manualPrices={manualPrices}
        onSaveManualPrice={(price) => {
          setManualPrices((saved) => [
            ...saved.filter(
              (other) =>
                other.itemId !== price.itemId ||
                other.marketId !== price.marketId,
            ),
            price,
          ]);
        }}
        onRemoveManualPrice={() => undefined}
        onMissingPrices={setMissing}
        specializations={NO_SPECIALIZATIONS}
        pins={pins}
        onPinMaterial={(itemId, marketId) => {
          setPins((current) => pinMaterial(current, itemId, marketId));
        }}
      />
    </>
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

  it("says which prices an entry is missing once they've loaded, and lists only the plan's", async () => {
    renderPlan(answering([lymhurst("T4_MAIN_SWORD", 5000)]));
    fireEvent.click(screen.getByRole("button", { name: "Add location" }));
    addBroadsword(screen.getByRole("region", { name: "Location 1" }));
    expect(screen.getByText("Loading prices…")).toBeInTheDocument();

    expect(await screen.findByText("Prices missing")).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: "2 prices missing" }),
    ).toBeInTheDocument();
  });

  it("works the plan out again with the missing prices typed", async () => {
    renderPlan(answering([lymhurst("T4_MAIN_SWORD", 5000)]));
    fireEvent.click(screen.getByRole("button", { name: "Add location" }));
    addBroadsword(screen.getByRole("region", { name: "Location 1" }));
    await screen.findByText("Prices missing");

    fireEvent.click(
      await screen.findByRole("button", { name: "2 prices missing" }),
    );
    const panel = screen.getByRole("dialog", { name: "Missing prices" });
    for (const [name, value] of [
      ["Steel Bar 4.0, sell order in Lymhurst", "100"],
      ["Worked Leather 4.0, sell order in Lymhurst", "50"],
    ] as const) {
      const field = within(panel).getByRole("textbox", { name });
      fireEvent.change(field, { target: { value } });
      fireEvent.keyDown(field, { key: "Enter" });
    }

    expect(total("Plan totals", "Profit")).toBe(
      total("Location 1 totals", "Profit"),
    );
    expect(screen.queryByText("Prices missing")).not.toBeInTheDocument();
  });

  it("takes typed sell prices in its rows and material prices in its shopping list", async () => {
    renderPlan(answering([lymhurst("T4_MAIN_SWORD", 5000)]));
    fireEvent.click(screen.getByRole("button", { name: "Add location" }));
    addBroadsword(screen.getByRole("region", { name: "Location 1" }));
    await screen.findByText("Prices missing");
    const field = (name: string) => screen.getByRole("textbox", { name });

    expect(field(`Sell price of ${BROADSWORD}`)).toHaveAttribute(
      "placeholder",
      "5,000",
    );
    for (const [name, value] of [
      ["Unit price of Steel Bar 4.0 in Lymhurst", "100"],
      ["Unit price of Worked Leather 4.0 in Lymhurst", "50"],
    ] as const) {
      fireEvent.change(field(name), { target: { value } });
      fireEvent.keyDown(field(name), { key: "Enter" });
    }
    const profit = total("Plan totals", "Profit");

    fireEvent.change(field(`Sell price of ${BROADSWORD}`), {
      target: { value: "9000" },
    });
    fireEvent.blur(field(`Sell price of ${BROADSWORD}`));

    expect(field(`Sell price of ${BROADSWORD}`)).toHaveValue("9000");
    expect(total("Plan totals", "Profit")).not.toBe(profit);
    expect(screen.queryByText("Prices missing")).not.toBeInTheDocument();
  });

  it("asks each market once for everything the plan needs there", async () => {
    const marketData = answering(broadswordPrices);
    const { getPrices } = marketData;
    renderPlan(marketData, {
      locations: [
        {
          id: "city",
          route: ROUTE,
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
            materialMarkets: everyMaterialIn("Lymhurst"),
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

  it("buys a material pinned to another market there, and lists it under that market", async () => {
    const marketData = answering([
      ...broadswordPrices,
      lymhurst("T4_METALBAR", 80, "Caerleon"),
    ]);
    renderPlan(marketData);
    fireEvent.click(screen.getByRole("button", { name: "Add location" }));
    addBroadsword(screen.getByRole("region", { name: "Location 1" }));
    const list = await screen.findByRole("region", { name: "Shopping list" });

    fireEvent.click(
      within(list).getByRole("button", {
        name: "Market for Steel Bar 4.0: Lymhurst",
      }),
    );
    fireEvent.click(within(list).getByRole("button", { name: "Caerleon" }));

    const caerleon = await within(list).findByRole("table", {
      name: "Caerleon",
    });
    expect(
      within(caerleon)
        .getAllByRole("rowheader")
        .map(({ textContent }) => textContent),
    ).toEqual(["Steel Bar 4.0", "Total"]);
    expect(
      within(caerleon).getByRole("textbox", {
        name: "Unit price of Steel Bar 4.0 in Caerleon",
      }),
    ).toHaveAttribute("placeholder", "80");
    expect(
      within(list).getByRole("button", {
        name: "Market for Steel Bar 4.0: Caerleon, pinned",
      }),
    ).toBeInTheDocument();
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
          route: ROUTE,
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

  it("keeps the last prices on screen when a later request fails", async () => {
    const working = answering(broadswordPrices);
    let requests = 0;
    const getPrices: MarketData["getPrices"] = (...args) => {
      requests += 1;
      return requests > 1
        ? Promise.reject(new Error("offline"))
        : working.getPrices(...args);
    };
    renderPlan({ ...working, getPrices });
    fireEvent.click(screen.getByRole("button", { name: "Add location" }));
    const location = screen.getByRole("region", { name: "Location 1" });
    addBroadsword(location);
    await screen.findByRole("list", { name: `Materials for ${BROADSWORD}` });

    fireEvent.change(within(location).getByLabelText("Add an item"), {
      target: { value: "bag" },
    });
    fireEvent.click(
      within(location).getByRole("button", { name: "Add Adept's Bag 4.0" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn’t fetch prices",
    );
    expect(
      within(location).getByRole("row", { name: new RegExp(BROADSWORD) }),
    ).not.toHaveTextContent("Missing");
    expect(
      await screen.findByRole("button", { name: "2 prices missing" }),
    ).toBeInTheDocument();
  });

  it("lets a quantity be cleared and typed again, and keeps the last good one until then", async () => {
    renderPlan();
    fireEvent.click(screen.getByRole("button", { name: "Add location" }));
    addBroadsword(screen.getByRole("region", { name: "Location 1" }));
    await screen.findByRole("list", { name: `Materials for ${BROADSWORD}` });
    const quantity = screen.getByLabelText(`Quantity of ${BROADSWORD}`);

    fireEvent.change(quantity, { target: { value: "" } });

    expect(quantity).toHaveValue(null);
    expect(total("Plan totals", "Focus")).toBe("1,286");

    fireEvent.change(quantity, { target: { value: "2" } });

    expect(total("Plan totals", "Focus")).toBe("2,572");

    fireEvent.change(quantity, { target: { value: "" } });
    fireEvent.blur(quantity);

    expect(quantity).toHaveValue(2);
  });

  it("says when the shopping list can't be copied", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
    });
    renderPlan();
    fireEvent.click(screen.getByRole("button", { name: "Add location" }));
    addBroadsword(screen.getByRole("region", { name: "Location 1" }));
    const list = await screen.findByRole("region", { name: "Shopping list" });

    fireEvent.click(within(list).getByRole("button", { name: "Copy as text" }));

    expect(
      await within(list).findByRole("button", { name: "Couldn’t copy" }),
    ).toBeInTheDocument();
  });
});
