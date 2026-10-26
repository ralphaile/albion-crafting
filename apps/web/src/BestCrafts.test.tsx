import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { recipes } from "@aoc/crafting-data";
import type {
  ItemPrices,
  MarketData,
  ObservedPrice,
  PricesResult,
} from "@aoc/market-prices";

import { BestCrafts } from "./BestCrafts";
import { formatCount } from "./format";
import { DEFAULT_ROUTE, type Route } from "./route";
import { DEFAULT_SETTINGS } from "./settings";
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

const everyPrice = /with every price/;

describe("BestCrafts", () => {
  it("asks for the materials where it buys and the items where it sells, at quality 1", async () => {
    const getPrices = vi.fn<MarketData["getPrices"]>((_itemIds, marketIds) =>
      broadswordPrices(marketIds),
    );
    renderBestCrafts(getPrices);

    await screen.findByText(everyPrice);

    expect(getPrices).toHaveBeenCalledTimes(2);
    expect(getPrices).toHaveBeenCalledWith(
      expect.arrayContaining(["T4_METALBAR", "T4_LEATHER"]),
      ["Martlock"],
      [1],
    );
    expect(getPrices).toHaveBeenCalledWith(
      expect.arrayContaining(["T4_MAIN_SWORD"]),
      ["Caerleon"],
      [1],
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

    await screen.findByText(everyPrice);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("counts the crafts that have every price", async () => {
    renderBestCrafts((_itemIds, marketIds) => broadswordPrices(marketIds));

    expect(
      await screen.findByText(
        `1 craft with every price, ${formatCount(recipes.length - 1)} crafts missing some`,
      ),
    ).toBeInTheDocument();
  });

  it("uses the prices it has when only some batches fail", async () => {
    renderBestCrafts(async (itemIds, marketIds) => ({
      ...(await broadswordPrices(marketIds)),
      failures: [{ itemIds: [...itemIds], error: new Error("AODP is down") }],
    }));

    expect(await screen.findByText(/^1 craft with every price/)).toBeVisible();
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

    expect(await screen.findByText(/^1 craft with every price/)).toBeVisible();
    expect(getPrices).toHaveBeenCalledTimes(4);
  });

  it("says what went wrong when fetching prices fails outright", async () => {
    renderBestCrafts(() => Promise.reject(new Error("Failed to fetch")));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Failed to fetch",
    );
  });
});
