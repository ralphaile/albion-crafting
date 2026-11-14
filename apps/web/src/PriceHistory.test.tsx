import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { MarketData, PricePoint } from "@aoc/market-prices";

import type { Craft } from "./best-crafts.types";
import { everyMaterialIn } from "./material-markets.helpers";
import { NO_PINS } from "./material-pins.constants";
import {
  chartGeometry,
  historySummary,
  inRange,
} from "./price-history.helpers";
import { PriceHistory } from "./PriceHistory";
import { fakeMarketData } from "../test/fake-market-data";

const DAY_MS = 24 * 60 * 60_000;
const NEWEST = Date.UTC(2026, 10, 10);

const days = (prices: number[]): PricePoint[] =>
  prices.map((averagePrice, index) => ({
    time: NEWEST - (prices.length - 1 - index) * DAY_MS,
    averagePrice,
    volume: 10 * (index + 1),
  }));

describe("inRange", () => {
  it("keeps the points of the range that ends at the newest point", () => {
    const month = days(Array.from({ length: 40 }, (_, index) => index));

    expect(inRange(month, "7d")).toHaveLength(7);
    expect(inRange(month, "30d")).toHaveLength(30);
    expect(inRange(month, "24h")).toHaveLength(1);
    expect(inRange([], "7d")).toEqual([]);
  });
});

describe("chartGeometry", () => {
  it("spreads the points across the width, the price and volume each filling the height", () => {
    const geometry = chartGeometry(days([100, 200, 300]), {
      width: 200,
      height: 100,
    });

    expect(geometry.points.map(({ x, y }) => [x, y])).toEqual([
      [0, 100],
      [100, 50],
      [200, 0],
    ]);
    expect(geometry.points.map(({ barY }) => Math.round(barY))).toEqual([
      67, 33, 0,
    ]);
    expect(geometry.currentY).toBeUndefined();
  });

  it("widens the price axis to show the current price", () => {
    const geometry = chartGeometry(days([100, 200]), {
      width: 200,
      height: 100,
      current: 400,
    });

    expect(geometry).toMatchObject({
      minPrice: 100,
      maxPrice: 400,
      currentY: 0,
    });
  });

  it("centres a single point", () => {
    expect(
      chartGeometry(days([100]), { width: 200, height: 100 }).points[0]?.x,
    ).toBe(100);
  });
});

describe("historySummary", () => {
  it("says where the price went, its range and how many sold", () => {
    expect(historySummary(days([300, 100, 200]), String)).toBe(
      "Average price from 300 to 200, between 100 and 300, 60 sold",
    );
    expect(historySummary([], String)).toBe("No history");
  });
});

const craft = {
  itemId: "T4_MAIN_SWORD",
  materialCost: {
    lines: [{ itemId: "T4_METALBAR" }, { itemId: "T4_LEATHER" }],
  },
  itemPrice: { status: "fresh", value: 350, origin: "api" },
  materialPrices: new Map(),
} as unknown as Craft;

function renderHistory(points: PricePoint[] = days([100, 200, 300])) {
  const getSeries = vi.fn<MarketData["getSeries"]>(() =>
    Promise.resolve(points),
  );
  render(
    <PriceHistory
      craft={craft}
      marketData={fakeMarketData({ getSeries })}
      region="west"
      buyMarkets={{
        buyMarketId: "Martlock",
        materialMarkets: everyMaterialIn("Thetford"),
        pins: NO_PINS,
      }}
      sellMarketId="Caerleon"
    />,
  );
  return getSeries;
}

describe("PriceHistory", () => {
  it("charts the item in the sell market, and a material in the market it's bought in", async () => {
    const getSeries = renderHistory();

    expect(
      await screen.findByRole("img", { name: "Price history" }),
    ).toHaveAccessibleDescription(
      "Average price from 100 to 300, between 100 and 300, 60 sold",
    );
    expect(getSeries).toHaveBeenLastCalledWith("T4_MAIN_SWORD", "Caerleon", 1, {
      hourly: false,
      region: "west",
    });

    fireEvent.click(screen.getByRole("button", { name: "Steel Bar 4.0" }));

    expect(getSeries).toHaveBeenLastCalledWith("T4_METALBAR", "Thetford", 1, {
      hourly: false,
      region: "west",
    });
  });

  it("asks for the hourly history for 24h", () => {
    const getSeries = renderHistory();

    fireEvent.click(screen.getByRole("button", { name: "24h" }));

    expect(getSeries).toHaveBeenLastCalledWith("T4_MAIN_SWORD", "Caerleon", 1, {
      hourly: true,
      region: "west",
    });
    expect(screen.getByRole("button", { name: "24h" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("steps through the points with the arrow keys, showing each one's time, price and volume", async () => {
    renderHistory();
    const chart = await screen.findByRole("img", { name: "Price history" });
    const tooltip = () =>
      within(chart.closest("figure") ?? document.body)
        .getAllByText(/./, { selector: "figcaption span" })
        .map((span) => span.textContent);

    fireEvent.keyDown(chart, { key: "ArrowLeft" });

    expect(tooltip()).toEqual(["9 Nov", "200", "20 sold"]);

    fireEvent.keyDown(chart, { key: "Home" });

    expect(tooltip()).toEqual(["8 Nov", "100", "10 sold"]);
  });

  it("says so when there's no history", async () => {
    renderHistory([]);

    expect(await screen.findByText("No history")).toBeInTheDocument();
  });
});
