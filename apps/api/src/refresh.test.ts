import { describe, expect, it, vi } from "vitest";

import { refreshPrices } from "./refresh.helpers.js";
import { aodpPrice, memoryPriceStore } from "../test/memory-prices.store.js";

describe("refreshPrices", () => {
  it("saves each server's prices, and counts the items it couldn't get", async () => {
    const store = memoryPriceStore();
    const getPrices = vi.fn(() =>
      Promise.resolve({
        prices: [aodpPrice("T4_BAG", "Caerleon", 1000)],
        failures: [{ itemIds: ["T5_BAG", "T6_BAG"] }],
      }),
    );
    let clock = 0;

    const reports = await refreshPrices(
      store,
      getPrices,
      ["T4_BAG", "T5_BAG", "T6_BAG"],
      ["west", "europe"],
      { now: () => (clock += 5000) },
    );

    expect(reports).toEqual([
      { region: "west", prices: 1, failedItems: 2, seconds: 5 },
      { region: "europe", prices: 1, failedItems: 2, seconds: 5 },
    ]);
    expect(getPrices).toHaveBeenCalledWith(
      ["T4_BAG", "T5_BAG", "T6_BAG"],
      expect.arrayContaining(["Caerleon", "Black Market"]),
      [1],
      { region: "europe" },
    );
    await expect(
      store.read("europe", ["T4_BAG"], ["Caerleon"], [1]),
    ).resolves.toEqual({
      rows: [aodpPrice("T4_BAG", "Caerleon", 1000)],
      fetchedAt: 15_000,
    });
  });

  it("asks no further server once aborted", async () => {
    const controller = new AbortController();
    const getPrices = vi.fn(() => {
      controller.abort();
      return Promise.resolve({ prices: [], failures: [] });
    });

    const reports = await refreshPrices(
      memoryPriceStore(),
      getPrices,
      ["T4_BAG"],
      ["west", "europe"],
      { signal: controller.signal },
    );

    expect(reports.map(({ region }) => region)).toEqual(["west"]);
  });
});
