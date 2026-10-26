import { describe, expect, it } from "vitest";

import { type AodpHistory, summarizeHistory } from "./index.js";
import history from "../test/fixtures/history.json" with { type: "json" };

function seriesOf(
  ...points: [day: number, sold: number, price: number][]
): AodpHistory {
  return {
    location: "Caerleon",
    item_id: "T4_BAG",
    quality: 1,
    data: points.map(([day, sold, price]) => ({
      item_count: sold,
      avg_price: price,
      timestamp: `2026-10-${String(day).padStart(2, "0")}T00:00:00`,
    })),
  };
}

describe("summarizeHistory", () => {
  it("averages the newest 7 days of the recorded T4 bag history in Caerleon", () => {
    const [summary] = summarizeHistory(history.body);

    expect(summary).toMatchObject({
      itemId: "T4_BAG",
      location: "Caerleon",
      quality: 1,
      averageDailyVolume: 155,
      newestDay: Date.UTC(2026, 9, 18),
    });
    expect(Math.round(summary?.averagePrice ?? 0)).toBe(4441);
  });

  it("averages over as many days as it's told to", () => {
    const [summary] = summarizeHistory(history.body, { days: 3 });

    expect(summary?.averageDailyVolume).toBeCloseTo(121.67, 2);
    expect(Math.round(summary?.averagePrice ?? 0)).toBe(4638);
  });

  it("weights each day's price by how many sold that day", () => {
    const [summary] = summarizeHistory([
      seriesOf([17, 99, 1000], [18, 1, 11_000]),
    ]);

    expect(summary?.averagePrice).toBe(1100);
  });

  it("counts days without a point as none sold, and leaves out older days", () => {
    const [summary] = summarizeHistory([
      seriesOf([11, 500, 9999], [12, 10, 1000], [18, 60, 1000]),
    ]);

    expect(summary?.averageDailyVolume).toBe(10);
    expect(summary?.averagePrice).toBe(1000);
  });

  it("has no average price, no sales and no newest day without data", () => {
    expect(summarizeHistory([seriesOf()])).toEqual([
      {
        itemId: "T4_BAG",
        location: "Caerleon",
        quality: 1,
        averagePrice: undefined,
        averageDailyVolume: 0,
        newestDay: undefined,
      },
    ]);
  });
});
