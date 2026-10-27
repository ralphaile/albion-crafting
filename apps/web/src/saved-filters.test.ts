import "fake-indexeddb/auto";

import { Dexie } from "dexie";
import { afterEach, describe, expect, it } from "vitest";

import { NO_FILTERS } from "./filters.constants";
import type { Filters } from "./filters.types";
import { memoryFilterStore, openFilterStore } from "./saved-filters.store";

const filters: Filters = {
  ...NO_FILTERS,
  tiers: [6],
  artifacts: "only",
  minProfit: 2500,
};

async function writeRaw(record: unknown) {
  const db = new Dexie("aoc-settings");
  db.version(1).stores({ settings: "id" });
  await db.table("settings").put(record);
  db.close();
}

describe("openFilterStore", () => {
  afterEach(async () => {
    await new Dexie("aoc-settings").delete();
  });

  it("has nothing saved at first", async () => {
    const store = await openFilterStore();

    expect(store.persistent).toBe(true);
    await expect(store.load()).resolves.toBeUndefined();
  });

  it("keeps the filters between visits", async () => {
    await (await openFilterStore()).save(filters);

    await expect((await openFilterStore()).load()).resolves.toEqual(filters);
  });

  it("ignores filters saved in a version it doesn't know", async () => {
    await writeRaw({ id: "filters", version: 99, value: filters });

    await expect((await openFilterStore()).load()).resolves.toBeUndefined();
  });

  it("drops saved values that no longer fit, and keeps the rest", async () => {
    await writeRaw({
      id: "filters",
      version: 1,
      value: { ...filters, tiers: [6, 12], artifacts: 42, search: null },
    });

    await expect((await openFilterStore()).load()).resolves.toEqual({
      ...filters,
      artifacts: "include",
    });
  });

  it("starts with no filters when the saved value isn't filters at all", async () => {
    await writeRaw({ id: "filters", version: 1, value: "tier=6" });

    await expect((await openFilterStore()).load()).resolves.toEqual(NO_FILTERS);
  });
});

describe("memoryFilterStore", () => {
  it("keeps the filters for this visit only", async () => {
    const store = memoryFilterStore();
    await store.save(filters);

    expect(store.persistent).toBe(false);
    await expect(store.load()).resolves.toEqual(filters);
  });
});
