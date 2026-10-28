import "fake-indexeddb/auto";

import { Dexie } from "dexie";
import { afterEach, describe, expect, it } from "vitest";

import { NO_FILTERS } from "./filters.constants";
import type { Filters } from "./filters.types";
import { DEFAULT_ROUTE_CHOICE } from "./route.constants";
import type { RouteChoice } from "./route.types";
import { FILTERS_SETTING, ROUTE_SETTING } from "./saved-settings.constants";
import { memorySettingsStore, openSettingsStore } from "./saved-settings.store";

const filters: Filters = {
  ...NO_FILTERS,
  tiers: [6],
  artifacts: "only",
  minProfit: 2500,
};

const route: RouteChoice = {
  place: { kind: "hideout", biomeId: "FOREST", quality: 6, level: 9 },
  buyMarketId: "Lymhurst",
  sellMarketId: "Black Market",
};

async function writeRaw(record: unknown) {
  const db = new Dexie("aoc-settings");
  db.version(1).stores({ settings: "id" });
  await db.table("settings").put(record);
  db.close();
}

describe("openSettingsStore", () => {
  afterEach(async () => {
    await new Dexie("aoc-settings").delete();
  });

  it("has nothing saved at first", async () => {
    const store = await openSettingsStore();

    expect(store.persistent).toBe(true);
    await expect(store.load(FILTERS_SETTING)).resolves.toBeUndefined();
    await expect(store.load(ROUTE_SETTING)).resolves.toBeUndefined();
  });

  it("keeps the filters and the route between visits", async () => {
    const store = await openSettingsStore();
    await store.save(FILTERS_SETTING, filters);
    await store.save(ROUTE_SETTING, route);

    const next = await openSettingsStore();
    await expect(next.load(FILTERS_SETTING)).resolves.toEqual(filters);
    await expect(next.load(ROUTE_SETTING)).resolves.toEqual(route);
  });

  it("ignores filters saved in a version it doesn't know", async () => {
    await writeRaw({ id: "filters", version: 99, value: filters });

    await expect(
      (await openSettingsStore()).load(FILTERS_SETTING),
    ).resolves.toBeUndefined();
  });

  it("drops saved values that no longer fit, and keeps the rest", async () => {
    await writeRaw({
      id: "filters",
      version: 1,
      value: { ...filters, tiers: [6, 12], artifacts: 42, search: null },
    });

    await expect(
      (await openSettingsStore()).load(FILTERS_SETTING),
    ).resolves.toEqual({ ...filters, artifacts: "include" });
  });

  it("starts with no filters when the saved value isn't filters at all", async () => {
    await writeRaw({ id: "filters", version: 1, value: "tier=6" });

    await expect(
      (await openSettingsStore()).load(FILTERS_SETTING),
    ).resolves.toEqual(NO_FILTERS);
  });

  it("falls back to the default place when a saved hideout no longer fits", async () => {
    await writeRaw({
      id: "route",
      version: 1,
      value: { ...route, place: { ...route.place, level: 10 } },
    });

    await expect(
      (await openSettingsStore()).load(ROUTE_SETTING),
    ).resolves.toEqual({ ...route, place: DEFAULT_ROUTE_CHOICE.place });
  });
});

describe("memorySettingsStore", () => {
  it("keeps each setting for this visit only", async () => {
    const store = memorySettingsStore();
    await store.save(FILTERS_SETTING, filters);
    await store.save(ROUTE_SETTING, route);

    expect(store.persistent).toBe(false);
    await expect(store.load(FILTERS_SETTING)).resolves.toEqual(filters);
    await expect(store.load(ROUTE_SETTING)).resolves.toEqual(route);
  });
});
