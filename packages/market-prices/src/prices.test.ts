import { afterEach, describe, expect, it, vi } from "vitest";

import type { AodpPrice } from "./aodp.schema.js";
import { normalizePrices } from "./prices.helpers.js";
import type { NormalizeOptions } from "./prices.types.js";
import pricesNoData from "../test/fixtures/prices-no-data.json" with { type: "json" };
import prices from "../test/fixtures/prices.json" with { type: "json" };

const NO_DATA = "0001-01-01T00:00:00";
const NOW = Date.UTC(2026, 9, 25, 12, 0);

afterEach(() => {
  vi.useRealTimers();
});

function rowSelling(value: number, date: string): AodpPrice {
  return {
    item_id: "T4_BAG",
    city: "Caerleon",
    quality: 1,
    sell_price_min: value,
    sell_price_min_date: date,
    sell_price_max: 0,
    sell_price_max_date: NO_DATA,
    buy_price_min: 0,
    buy_price_min_date: NO_DATA,
    buy_price_max: 0,
    buy_price_max_date: NO_DATA,
  };
}

function sellMin(value: number, date: string, options: NormalizeOptions = {}) {
  const [itemPrices] = normalizePrices([rowSelling(value, date)], {
    now: NOW,
    ...options,
  });
  return itemPrices?.sellMin;
}

describe("normalizePrices", () => {
  it.each([
    {
      case: "fresh, 2 hours old",
      date: "2026-10-25T10:00:00",
      expected: {
        status: "fresh",
        value: 4500,
        observedAt: Date.UTC(2026, 9, 25, 10, 0),
        ageMinutes: 120,
      },
    },
    {
      case: "fresh at exactly 12 hours old",
      date: "2026-10-25T00:00:00",
      expected: {
        status: "fresh",
        value: 4500,
        observedAt: Date.UTC(2026, 9, 25, 0, 0),
        ageMinutes: 720,
      },
    },
    {
      case: "stale at 12 hours and 1 minute old",
      date: "2026-10-24T23:59:00",
      expected: {
        status: "stale",
        value: 4500,
        observedAt: Date.UTC(2026, 9, 24, 23, 59),
        ageMinutes: 721,
      },
    },
    {
      case: "0 minutes old when AODP's clock is ahead",
      date: "2026-10-25T12:05:00",
      expected: {
        status: "fresh",
        value: 4500,
        observedAt: Date.UTC(2026, 9, 25, 12, 5),
        ageMinutes: 0,
      },
    },
    {
      case: "read once when the date already ends in Z",
      date: "2026-10-25T10:00:00Z",
      expected: {
        status: "fresh",
        value: 4500,
        observedAt: Date.UTC(2026, 9, 25, 10, 0),
        ageMinutes: 120,
      },
    },
    {
      case: "missing when dated 0001-01-01",
      date: NO_DATA,
      expected: { status: "missing" },
    },
  ])("is $case", ({ date, expected }) => {
    expect(sellMin(4500, date)).toEqual(expected);
  });

  it("is missing when the price is 0", () => {
    expect(sellMin(0, "2026-10-25T10:00:00")).toEqual({ status: "missing" });
  });

  it("reads AODP's dates as UTC, even where local time isn't UTC", () => {
    // vitest.config.ts runs these tests in Tokyo time, 9 hours ahead of UTC
    expect(new Date(NOW).getTimezoneOffset()).toBe(-9 * 60);

    expect(sellMin(4500, "2026-10-25T10:00:00")).toHaveProperty(
      "observedAt",
      Date.UTC(2026, 9, 25, 10, 0),
    );
  });

  it("marks prices stale after the threshold it's given", () => {
    expect(
      sellMin(4500, "2026-10-25T10:00:00", { staleAfterMinutes: 60 }),
    ).toHaveProperty("status", "stale");
  });

  it("measures age from the current time when not given one", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    const [itemPrices] = normalizePrices([
      rowSelling(4500, "2026-10-25T10:00:00"),
    ]);

    expect(itemPrices?.sellMin).toHaveProperty("ageMinutes", 120);
  });

  it("keeps the cheapest sell order and the best buy order of each recorded row", () => {
    const recordedAt = Date.UTC(2026, 9, 25, 1, 45);

    expect(normalizePrices(prices.body, { now: recordedAt })).toEqual([
      {
        itemId: "T4_BAG",
        marketId: "Caerleon",
        quality: 1,
        sellMin: {
          status: "fresh",
          value: 40000,
          observedAt: Date.UTC(2026, 9, 25, 0, 15),
          ageMinutes: 90,
        },
        buyMax: {
          status: "fresh",
          value: 3505,
          observedAt: Date.UTC(2026, 9, 25, 0, 15),
          ageMinutes: 90,
        },
      },
      {
        itemId: "T4_BAG",
        marketId: "Lymhurst",
        quality: 1,
        sellMin: {
          status: "fresh",
          value: 3000,
          observedAt: Date.UTC(2026, 9, 24, 23, 15),
          ageMinutes: 150,
        },
        buyMax: {
          status: "fresh",
          value: 2131,
          observedAt: Date.UTC(2026, 9, 24, 21, 20),
          ageMinutes: 265,
        },
      },
      {
        itemId: "T5_BAG",
        marketId: "Caerleon",
        quality: 1,
        sellMin: {
          status: "fresh",
          value: 21975,
          observedAt: Date.UTC(2026, 9, 24, 23, 45),
          ageMinutes: 120,
        },
        buyMax: {
          status: "fresh",
          value: 11101,
          observedAt: Date.UTC(2026, 9, 24, 23, 55),
          ageMinutes: 110,
        },
      },
      {
        itemId: "T5_BAG",
        marketId: "Lymhurst",
        quality: 1,
        sellMin: {
          status: "fresh",
          value: 15393,
          observedAt: Date.UTC(2026, 9, 24, 20, 10),
          ageMinutes: 335,
        },
        buyMax: {
          status: "fresh",
          value: 12123,
          observedAt: Date.UTC(2026, 9, 24, 20, 10),
          ageMinutes: 335,
        },
      },
    ]);
  });

  it("marks both prices of the recorded no-data row missing", () => {
    expect(normalizePrices(pricesNoData.body, { now: NOW })).toEqual([
      {
        itemId: "T8_BAG_INSIGHT@4",
        marketId: "Thetford",
        quality: 5,
        sellMin: { status: "missing" },
        buyMax: { status: "missing" },
      },
    ]);
  });
});
