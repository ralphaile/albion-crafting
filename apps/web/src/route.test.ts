import { describe, expect, it } from "vitest";

import { DEFAULT_ROUTE_CHOICE } from "./route.constants";
import { routeFromChoice, settingsForRoute } from "./route.helpers";
import { parseRoute } from "./route.schema";
import type { RouteChoice } from "./route.types";
import { DEFAULT_SETTINGS } from "./settings.constants";

const hideout: RouteChoice = {
  place: { kind: "hideout", biomeId: "FOREST", quality: 6, level: 9 },
  buyMarketId: "Fort Sterling",
  sellMarketId: "Arthurs Rest Smugglers Network",
};

describe("routeFromChoice", () => {
  it("finds a location by its ID", () => {
    const { place } = routeFromChoice({
      ...DEFAULT_ROUTE_CHOICE,
      place: { kind: "location", locationId: "4300" },
    });

    expect("location" in place && place.location.name).toBe("Arthur's Rest");
  });

  it("builds a hideout from its biome, map quality and power level", () => {
    const { place, buyMarketId, sellMarketId } = routeFromChoice(hideout);

    if (!("hideout" in place)) throw new Error("Expected a hideout");
    expect(place.hideout).toMatchObject({
      biome: { name: "Forest", cityId: "1000" },
      mapQuality: { quality: 6, specialtyBonus: 0.26 },
      powerLevel: { level: 9, generalBonus: 0.26, specialistBonus: 0.3 },
    });
    expect([buyMarketId, sellMarketId]).toEqual([
      "Fort Sterling",
      "Arthurs Rest Smugglers Network",
    ]);
  });

  it("refuses a place the game data doesn't have", () => {
    expect(() =>
      routeFromChoice({
        ...DEFAULT_ROUTE_CHOICE,
        place: { kind: "location", locationId: "9999" },
      }),
    ).toThrow("The route names a place the game data doesn't have");
  });
});

describe("settingsForRoute", () => {
  it("sells to the Black Market's buy orders, whatever the sell mode", () => {
    const route = routeFromChoice({
      ...DEFAULT_ROUTE_CHOICE,
      sellMarketId: "Black Market",
    });

    expect(settingsForRoute(DEFAULT_SETTINGS, route).sellMode).toBe(
      "blackMarket",
    );
  });

  it("keeps the sell mode everywhere else", () => {
    const route = routeFromChoice(DEFAULT_ROUTE_CHOICE);

    expect(settingsForRoute(DEFAULT_SETTINGS, route)).toBe(DEFAULT_SETTINGS);
  });
});

describe("parseRoute", () => {
  it("keeps a route that fits", () => {
    expect(parseRoute(hideout)).toEqual(hideout);
  });

  it("falls back to the default route for anything else", () => {
    expect(parseRoute("place=1000")).toEqual(DEFAULT_ROUTE_CHOICE);
  });

  it.each([
    ["an unknown location", { kind: "location", locationId: "9999" }],
    ["an unknown biome", { ...hideout.place, biomeId: "OCEAN" }],
    ["map quality 7", { ...hideout.place, quality: 7 }],
    ["power level 0", { ...hideout.place, level: 0 }],
    ["a fractional level", { ...hideout.place, level: 8.5 }],
    ["an unknown kind", { kind: "guild hall" }],
  ])("falls back to the default place for %s", (_case, place) => {
    expect(parseRoute({ ...hideout, place })).toEqual({
      ...hideout,
      place: DEFAULT_ROUTE_CHOICE.place,
    });
  });

  it("doesn't buy at the Black Market, which only buys", () => {
    expect(
      parseRoute({ ...hideout, buyMarketId: "Black Market" }).buyMarketId,
    ).toBe(DEFAULT_ROUTE_CHOICE.buyMarketId);
  });

  it("drops a market it doesn't know, and keeps the rest", () => {
    expect(parseRoute({ ...hideout, sellMarketId: "__proto__" })).toEqual({
      ...hideout,
      sellMarketId: DEFAULT_ROUTE_CHOICE.sellMarketId,
    });
  });
});
