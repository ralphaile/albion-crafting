import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { recipes } from "@aoc/crafting-data";
import type { ItemPrices, MarketData } from "@aoc/market-prices";

import { App } from "./App";
import { NO_FILTERS } from "./filters.constants";
import type { Filters } from "./filters.types";
import { formatCount } from "./format.helpers";
import { memoryManualPriceStore } from "./manual-prices.store";
import type { ManualPrice } from "./manual-prices.types";
import type { RouteChoice } from "./route.types";
import {
  CRAFTING_SETTING,
  FILTERS_SETTING,
  ROUTE_SETTING,
} from "./saved-settings.constants";
import { memorySettingsStore } from "./saved-settings.store";
import { DEFAULT_SETTINGS } from "./settings.constants";
import type { CraftingSettings } from "./settings.types";
import { fakeMarketData, noPrices } from "../test/fake-market-data";

const DEFAULT_ROUTE_SEARCH = "place=1000&buy=Lymhurst&sell=Lymhurst";

const hideout: RouteChoice = {
  place: { kind: "hideout", biomeId: "FOREST", quality: 6, level: 9 },
  buyMarketId: "Martlock",
  sellMarketId: "Caerleon",
};

async function renderApp({
  savedFilters,
  savedRoute,
  savedSettings,
  savedManualPrices = [],
  marketData = fakeMarketData(),
}: {
  savedFilters?: Filters;
  savedRoute?: RouteChoice;
  savedSettings?: CraftingSettings;
  savedManualPrices?: readonly ManualPrice[];
  marketData?: MarketData;
} = {}) {
  const settingsStore = memorySettingsStore();
  if (savedFilters !== undefined) {
    await settingsStore.save(FILTERS_SETTING, savedFilters);
  }
  if (savedRoute !== undefined) {
    await settingsStore.save(ROUTE_SETTING, savedRoute);
  }
  if (savedSettings !== undefined) {
    await settingsStore.save(CRAFTING_SETTING, savedSettings);
  }
  render(
    <App
      marketData={marketData}
      settingsStore={settingsStore}
      manualPriceStore={memoryManualPriceStore()}
      savedFilters={savedFilters}
      savedRoute={savedRoute}
      savedSettings={savedSettings}
      savedManualPrices={savedManualPrices}
    />,
  );
  return settingsStore;
}

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
  return fakeMarketData({
    getPrices: (itemIds) =>
      Promise.resolve({
        prices: prices.filter(({ itemId }) => itemIds.includes(itemId)),
        failures: [],
        fetchedAt: 0,
      }),
  });
}

const broadswordPrices = [
  lymhurst("T4_METALBAR", 100),
  lymhurst("T4_LEATHER", 50),
  lymhurst("T4_MAIN_SWORD", 5000),
];

function broadswordPanel() {
  return screen.queryByRole("dialog", { name: "Adept's Broadsword 4.0" });
}

function selected(name: string) {
  return screen.getByRole("combobox", { name });
}

function pressed(name: string) {
  return screen.getByRole("button", { name }).getAttribute("aria-pressed");
}

describe("App", () => {
  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("shows the app title as a heading", async () => {
    await renderApp();

    expect(
      screen.getByRole("heading", { name: "Albion Crafting" }),
    ).toBeInTheDocument();
  });

  it("starts with the filters this browser saved", async () => {
    await renderApp({ savedFilters: { ...NO_FILTERS, tiers: [6] } });

    expect(pressed("T6")).toBe("true");
    expect(window.location.search).toBe(`?${DEFAULT_ROUTE_SEARCH}&tier=6`);
  });

  it("starts with a shared link's filters instead, and saves them only once you change one", async () => {
    window.history.replaceState(null, "", "/?tier=7&artifacts=only");
    const settingsStore = await renderApp({
      savedFilters: { ...NO_FILTERS, tiers: [6] },
    });

    expect(pressed("T7")).toBe("true");
    expect(pressed("T6")).toBe("false");
    await expect(settingsStore.load(FILTERS_SETTING)).resolves.toMatchObject({
      tiers: [6],
      artifacts: "include",
    });

    fireEvent.click(screen.getByRole("button", { name: "T5" }));

    await expect
      .poll(() => settingsStore.load(FILTERS_SETTING))
      .toMatchObject({ tiers: [5, 7], artifacts: "only" });
  });

  it("saves a change back to no filters", async () => {
    const settingsStore = await renderApp();

    fireEvent.click(screen.getByRole("button", { name: "T5" }));
    fireEvent.click(screen.getByRole("button", { name: "T5" }));

    await expect
      .poll(() => settingsStore.load(FILTERS_SETTING))
      .toMatchObject({ tiers: [] });
  });

  it("puts each change in the link and saves it", async () => {
    const settingsStore = await renderApp();

    fireEvent.click(screen.getByRole("button", { name: "T5" }));

    await expect
      .poll(() => window.location.search)
      .toBe(`?${DEFAULT_ROUTE_SEARCH}&tier=5`);
    await expect(settingsStore.load(FILTERS_SETTING)).resolves.toMatchObject({
      tiers: [5],
    });
  });

  it("starts with the route this browser saved, and puts it in the link", async () => {
    await renderApp({ savedRoute: hideout });

    expect(selected("Crafting location")).toHaveValue("hideout");
    expect(selected("Biome")).toHaveValue("FOREST");
    expect(selected("Buy materials in")).toHaveValue("Martlock");
    expect(selected("Sell in")).toHaveValue("Caerleon");
    expect(window.location.search).toBe(
      "?place=hideout&biome=FOREST&quality=6&level=9&buy=Martlock&sell=Caerleon",
    );
  });

  it("starts with a shared link's route instead, and keeps the saved one", async () => {
    window.history.replaceState(null, "", "/?place=0000&buy=Thetford");
    const settingsStore = await renderApp({ savedRoute: hideout });

    expect(selected("Crafting location")).toHaveValue("0000");
    expect(selected("Buy materials in")).toHaveValue("Thetford");
    expect(selected("Sell in")).toHaveValue("Lymhurst");
    await expect(settingsStore.load(ROUTE_SETTING)).resolves.toEqual(hideout);
  });

  it("prices with the settings this browser saved", async () => {
    const getPrices = vi.fn<MarketData["getPrices"]>(() =>
      Promise.resolve(noPrices),
    );
    await renderApp({
      savedSettings: {
        ...DEFAULT_SETTINGS,
        server: "europe",
        staleAfterHours: 24,
      },
      marketData: fakeMarketData({ getPrices }),
    });

    await vi.waitFor(() => {
      expect(getPrices).toHaveBeenCalledWith(
        expect.anything(),
        ["Lymhurst"],
        [1],
        { region: "europe", staleAfterMinutes: 24 * 60 },
      );
    });
  });

  it("prices with the manual prices this browser saved", async () => {
    await renderApp({
      savedManualPrices: ["T4_METALBAR", "T4_LEATHER", "T4_MAIN_SWORD"].map(
        (itemId) => ({
          region: "west",
          itemId,
          marketId: "Lymhurst",
          quality: 1,
          source: "sellMin",
          value: 100,
          enteredAt: Date.now(),
        }),
      ),
    });

    expect(
      await screen.findByText(
        `Missing prices · ${formatCount(recipes.length - 1)} crafts`,
      ),
    ).toBeInTheDocument();
  });

  it("lists the missing prices of hidden crafts, and shows a craft once its price is filled", async () => {
    const prices = [
      lymhurst("T4_METALBAR", 100),
      lymhurst("T4_MAIN_SWORD", 5000),
    ];
    await renderApp({
      savedFilters: {
        ...NO_FILTERS,
        tiers: [4],
        enchants: [0],
        search: "broadsword",
        hideIncomplete: true,
      },
      marketData: answering(prices),
    });
    expect(
      await screen.findByText("No crafts match your filters"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "1 price missing" }));
    const leather = within(
      screen.getByRole("dialog", { name: "Missing prices" }),
    ).getByRole("textbox", {
      name: "Worked Leather 4.0, sell order in Lymhurst",
    });
    fireEvent.change(leather, { target: { value: "50" } });
    fireEvent.keyDown(leather, { key: "Enter" });

    expect(
      within(screen.getByRole("region", { name: "Best crafts" })).getByRole(
        "rowheader",
        { name: /Adept's Broadsword/ },
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /missing$/ }),
    ).not.toBeInTheDocument();
  });

  it("saves a setting changed in the panel", async () => {
    const settingsStore = await renderApp();

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Use focus" }));

    await expect
      .poll(() => settingsStore.load(CRAFTING_SETTING))
      .toEqual({ ...DEFAULT_SETTINGS, focus: false });
  });

  it("opens the craft a link names, keeps it in the link while open, and drops it once closed", async () => {
    window.history.replaceState(
      null,
      "",
      "/?tier=4&enchant=0&q=broadsword&item=T4_MAIN_SWORD",
    );
    await renderApp({ marketData: answering(broadswordPrices) });

    expect(
      await screen.findByRole("dialog", { name: "Adept's Broadsword 4.0" }),
    ).toBeInTheDocument();
    expect(window.location.search).toContain("item=T4_MAIN_SWORD");

    fireEvent.click(screen.getByRole("button", { name: "Close details" }));

    expect(broadswordPanel()).not.toBeInTheDocument();
    expect(window.location.search).not.toContain("item=");
  });

  it("puts a craft opened from the table in the link", async () => {
    await renderApp({
      savedFilters: { ...NO_FILTERS, search: "broadsword", tiers: [4] },
      marketData: answering(broadswordPrices),
    });

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Prices for Adept's Broadsword 4.0",
      }),
    );

    expect(window.location.search).toContain("item=T4_MAIN_SWORD");
  });

  it("keeps a craft open when a typed price drops it below the minimum profit", async () => {
    window.history.replaceState(
      null,
      "",
      "/?tier=4&enchant=0&q=broadsword&profit=1000&item=T4_MAIN_SWORD",
    );
    await renderApp({ marketData: answering(broadswordPrices) });
    const sword = within(
      await screen.findByRole("dialog", { name: "Adept's Broadsword 4.0" }),
    ).getByRole("textbox", {
      name: "Adept's Broadsword 4.0, sell order in Lymhurst",
    });

    fireEvent.change(sword, { target: { value: "1000" } });
    fireEvent.keyDown(sword, { key: "Enter" });

    expect(
      screen.getByText("No crafts match your filters"),
    ).toBeInTheDocument();
    expect(broadswordPanel()).toBeInTheDocument();
  });

  it("drops a linked craft the route doesn't have", async () => {
    window.history.replaceState(
      null,
      "",
      "/?tier=4&enchant=0&q=broadsword&item=T8_MAIN_SWORD",
    );
    await renderApp({ marketData: answering(broadswordPrices) });

    await screen.findByRole("region", { name: "Best crafts" });

    expect(window.location.search).not.toContain("item=");
  });

  it("prices a changed route right away, puts it in the link and saves it", async () => {
    const getPrices = vi.fn<MarketData["getPrices"]>(() =>
      Promise.resolve(noPrices),
    );
    const settingsStore = await renderApp({
      marketData: fakeMarketData({ getPrices }),
    });

    fireEvent.change(selected("Sell in"), { target: { value: "Caerleon" } });

    await expect
      .poll(() => window.location.search)
      .toBe("?place=1000&buy=Lymhurst&sell=Caerleon");
    await expect(settingsStore.load(ROUTE_SETTING)).resolves.toMatchObject({
      sellMarketId: "Caerleon",
    });
    await expect
      .poll(() => getPrices.mock.calls.map(([, marketIds]) => marketIds))
      .toContainEqual(["Caerleon"]);
  });
});
