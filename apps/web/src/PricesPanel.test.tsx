import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ItemPrices, MarketData } from "@aoc/market-prices";

import { BestCrafts } from "./BestCrafts";
import { NO_FILTERS } from "./filters.constants";
import { memoryManualPriceStore } from "./manual-prices.store";
import type { ManualPrice, ManualPriceStore } from "./manual-prices.types";
import { DEFAULT_ROUTE } from "./route.constants";
import type { Route } from "./route.types";
import { DEFAULT_SETTINGS } from "./settings.constants";
import { useManualPrices } from "./useManualPrices";
import { fakeMarketData } from "../test/fake-market-data";

const route: Route = {
  place: DEFAULT_ROUTE.place,
  buyMarketId: "Martlock",
  sellMarketId: "Caerleon",
};

const broadswordOnly = {
  ...NO_FILTERS,
  tiers: [4],
  enchants: [0],
  search: "broadsword",
};

function priced(itemId: string, marketId: string, value: number): ItemPrices {
  return {
    itemId,
    marketId,
    quality: 1,
    sellMin: { status: "fresh", value, observedAt: 0, ageMinutes: 30 },
    buyMax: { status: "missing" },
  };
}

const typedLeather: ManualPrice = {
  region: "west",
  itemId: "T4_LEATHER",
  marketId: "Martlock",
  quality: 1,
  source: "sellMin",
  value: 50,
  enteredAt: Date.now(),
};

function Broadsword({
  marketData,
  store,
  initial,
}: {
  marketData: MarketData;
  store: ManualPriceStore;
  initial: readonly ManualPrice[];
}) {
  const { manualPrices, saveManualPrice, removeManualPrice } = useManualPrices(
    store,
    initial,
  );
  return (
    <BestCrafts
      marketData={marketData}
      route={route}
      settings={DEFAULT_SETTINGS}
      filters={broadswordOnly}
      manualPrices={manualPrices}
      onSaveManualPrice={saveManualPrice}
      onRemoveManualPrice={removeManualPrice}
    />
  );
}

// The broadsword's leather has no price at Martlock.
function renderBroadsword(initial: readonly ManualPrice[] = []) {
  const getPrices = vi.fn<MarketData["getPrices"]>((_itemIds, marketIds) =>
    Promise.resolve({
      prices:
        marketIds[0] === "Martlock"
          ? [priced("T4_METALBAR", "Martlock", 100)]
          : [priced("T4_MAIN_SWORD", "Caerleon", 5000)],
      failures: [],
      fetchedAt: 0,
    }),
  );
  const store = memoryManualPriceStore();
  render(
    <Broadsword
      marketData={fakeMarketData({ getPrices })}
      store={store}
      initial={initial}
    />,
  );
  return { getPrices, store };
}

function panel() {
  return screen.getByRole("dialog", { name: "Adept's Broadsword 4.0" });
}

function field(name: string) {
  return within(panel()).getByRole("textbox", { name });
}

const leather = "Worked Leather 4.0, sell order in Martlock";

async function openFromMissingPrices() {
  fireEvent.click(
    await screen.findByRole("button", { name: "1 price missing" }),
  );
}

function type(name: string, text: string, key = "Enter") {
  fireEvent.change(field(name), { target: { value: text } });
  fireEvent.keyDown(field(name), { key });
}

describe("PricesPanel", () => {
  it("lists the item's sell price and each material's buy price", async () => {
    renderBroadsword();
    await openFromMissingPrices();

    expect(
      within(panel())
        .getAllByRole("textbox")
        .map((input) => input.getAttribute("aria-label")),
    ).toEqual([
      "Adept's Broadsword 4.0, sell order in Caerleon",
      "Steel Bar 4.0, sell order in Martlock",
      leather,
    ]);
    expect(field("Steel Bar 4.0, sell order in Martlock")).toHaveAttribute(
      "placeholder",
      "100",
    );
    expect(
      field("Steel Bar 4.0, sell order in Martlock"),
    ).toHaveAccessibleDescription("Sell order · Martlock · seen 30 min ago");
    expect(field(leather)).toHaveAccessibleDescription(
      "Sell order · Martlock · missing",
    );
  });

  it("saves a typed price on Enter, and prices the craft without asking AODP again", async () => {
    const { getPrices, store } = renderBroadsword();
    await openFromMissingPrices();

    type(leather, "50");

    expect(
      screen.queryByRole("button", { name: "1 price missing" }),
    ).not.toBeInTheDocument();
    expect(field(leather)).toHaveValue("50");
    expect(field(leather)).toHaveAccessibleDescription(
      "Sell order · Martlock · typed just now",
    );
    await expect(store.list()).resolves.toEqual([
      { ...typedLeather, enteredAt: expect.any(Number) as number },
    ]);
    expect(getPrices).toHaveBeenCalledTimes(2);
  });

  it("saves a typed price on leaving the field", async () => {
    const { store } = renderBroadsword();
    await openFromMissingPrices();

    fireEvent.change(field(leather), { target: { value: "60" } });
    fireEvent.blur(field(leather));

    await expect(store.list()).resolves.toMatchObject([{ value: 60 }]);
  });

  it.each(["12.5k", "1e3", "0", "-5", "12.5"])(
    "refuses %j and says what it needs",
    async (text) => {
      const { store } = renderBroadsword();
      await openFromMissingPrices();

      type(leather, text);

      expect(field(leather)).toBeInvalid();
      expect(field(leather)).toHaveAccessibleDescription(
        "Sell order · Martlock · missing Whole silver above 0, like 1500",
      );
      await expect(store.list()).resolves.toEqual([]);
    },
  );

  it("cancels the typing on Escape, and keeps the panel open", async () => {
    const { store } = renderBroadsword([typedLeather]);
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Prices for Adept's Broadsword 4.0",
      }),
    );

    type(leather, "70", "Escape");

    expect(field(leather)).toHaveValue("50");
    expect(panel()).toBeInTheDocument();
    await expect(store.list()).resolves.toEqual([]);
  });

  it("removes a manual price when its field is emptied", async () => {
    const { store } = renderBroadsword([typedLeather]);
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Prices for Adept's Broadsword 4.0",
      }),
    );

    type(leather, "");

    expect(field(leather)).toHaveAccessibleDescription(
      "Sell order · Martlock · missing",
    );
    expect(
      screen.getByRole("button", { name: "1 price missing" }),
    ).toBeInTheDocument();
    await expect(store.list()).resolves.toEqual([]);
  });

  it("closes with its close button", async () => {
    renderBroadsword();
    await openFromMissingPrices();

    fireEvent.click(screen.getByRole("button", { name: "Close prices" }));

    expect(
      screen.queryByRole("dialog", { name: "Adept's Broadsword 4.0" }),
    ).not.toBeInTheDocument();
  });
});
