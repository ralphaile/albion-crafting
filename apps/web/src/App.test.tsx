import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { MarketData } from "@aoc/market-prices";

import { App } from "./App";
import { NO_FILTERS } from "./filters.constants";
import type { Filters } from "./filters.types";
import type { RouteChoice } from "./route.types";
import { FILTERS_SETTING, ROUTE_SETTING } from "./saved-settings.constants";
import { memorySettingsStore } from "./saved-settings.store";
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
  marketData = fakeMarketData(),
}: {
  savedFilters?: Filters;
  savedRoute?: RouteChoice;
  marketData?: MarketData;
} = {}) {
  const settingsStore = memorySettingsStore();
  if (savedFilters !== undefined) {
    await settingsStore.save(FILTERS_SETTING, savedFilters);
  }
  if (savedRoute !== undefined) {
    await settingsStore.save(ROUTE_SETTING, savedRoute);
  }
  render(
    <App
      marketData={marketData}
      settingsStore={settingsStore}
      savedFilters={savedFilters}
      savedRoute={savedRoute}
    />,
  );
  return settingsStore;
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
