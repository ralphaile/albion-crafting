import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { App } from "./App";
import { NO_FILTERS } from "./filters.constants";
import { memoryFilterStore } from "./saved-filters.store";
import { fakeMarketData } from "../test/fake-market-data";

function renderApp(savedFilters = NO_FILTERS) {
  const filterStore = memoryFilterStore();
  render(
    <App
      marketData={fakeMarketData()}
      filterStore={filterStore}
      savedFilters={savedFilters}
    />,
  );
  return filterStore;
}

function pressed(name: string) {
  return screen.getByRole("button", { name }).getAttribute("aria-pressed");
}

describe("App", () => {
  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("shows the app title as a heading", () => {
    renderApp();

    expect(
      screen.getByRole("heading", { name: "Albion Crafting" }),
    ).toBeInTheDocument();
  });

  it("starts with the filters this browser saved", () => {
    renderApp({ ...NO_FILTERS, tiers: [6] });

    expect(pressed("T6")).toBe("true");
    expect(window.location.search).toBe("?tier=6");
  });

  it("starts with a shared link's filters instead, and saves them", async () => {
    window.history.replaceState(null, "", "/?tier=7&artifacts=only");
    const filterStore = renderApp({ ...NO_FILTERS, tiers: [6] });

    expect(pressed("T7")).toBe("true");
    expect(pressed("T6")).toBe("false");
    await expect(filterStore.load()).resolves.toMatchObject({
      tiers: [7],
      artifacts: "only",
    });
  });

  it("puts each change in the link and saves it", async () => {
    const filterStore = renderApp();

    fireEvent.click(screen.getByRole("button", { name: "T5" }));

    await expect.poll(() => window.location.search).toBe("?tier=5");
    await expect(filterStore.load()).resolves.toMatchObject({ tiers: [5] });
  });
});
