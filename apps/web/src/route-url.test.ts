import { describe, expect, it } from "vitest";

import { routeFromSearch, searchWithRoute } from "./route-url.helpers";
import { DEFAULT_ROUTE_CHOICE } from "./route.constants";
import type { RouteChoice } from "./route.types";

const hideout: RouteChoice = {
  place: { kind: "hideout", biomeId: "FOREST", quality: 6, level: 9 },
  buyMarketId: "Fort Sterling",
  sellMarketId: "Arthurs Rest Smugglers Network",
};

describe("searchWithRoute", () => {
  it("writes the whole route, even the default one", () => {
    expect(searchWithRoute("", DEFAULT_ROUTE_CHOICE)).toBe(
      "?place=1000&buy=Lymhurst&sell=Lymhurst",
    );
  });

  it("writes a hideout's biome, map quality and power level", () => {
    expect(searchWithRoute("", hideout)).toBe(
      "?place=hideout&biome=FOREST&quality=6&level=9&buy=Fort+Sterling&sell=Arthurs+Rest+Smugglers+Network",
    );
  });

  it("keeps other parameters and replaces an old route", () => {
    expect(
      searchWithRoute(
        "?tier=6&place=hideout&biome=SWAMP",
        DEFAULT_ROUTE_CHOICE,
      ),
    ).toBe("?tier=6&place=1000&buy=Lymhurst&sell=Lymhurst");
  });
});

describe("routeFromSearch", () => {
  it("reads back every route it wrote", () => {
    expect(routeFromSearch(searchWithRoute("", hideout))).toEqual(hideout);
    expect(routeFromSearch(searchWithRoute("", DEFAULT_ROUTE_CHOICE))).toEqual(
      DEFAULT_ROUTE_CHOICE,
    );
  });

  it("is undefined when the link has no route", () => {
    expect(routeFromSearch("?tier=6&q=sword")).toBeUndefined();
  });

  it("fills in what a partial link leaves out from the default route", () => {
    expect(routeFromSearch("?sell=Caerleon")).toEqual({
      ...DEFAULT_ROUTE_CHOICE,
      sellMarketId: "Caerleon",
    });
  });

  it.each([
    ["text", "quality=six"],
    ["a fraction", "quality=5.5"],
    ["a huge number", "quality=1e400"],
    ["an empty value", "quality="],
  ])(
    "falls back to the default place for a map quality that's %s",
    (_case, quality) => {
      expect(
        routeFromSearch(`?place=hideout&biome=FOREST&${quality}&level=9`)
          ?.place,
      ).toEqual(DEFAULT_ROUTE_CHOICE.place);
    },
  );
});
