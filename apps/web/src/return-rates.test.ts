import { describe, expect, it } from "vitest";

import { formatReturnRate } from "./format.helpers";
import { placeReturnRates } from "./return-rates.helpers";
import type { ReturnRates } from "./return-rates.types";
import { routeFromChoice } from "./route.helpers";
import type { PlaceChoice } from "./route.types";

function ratesAt(place: PlaceChoice) {
  return placeReturnRates(
    routeFromChoice({
      place,
      buyMarketId: "Lymhurst",
      sellMarketId: "Lymhurst",
    }).place,
  );
}

function shown(rates: ReturnRates | undefined) {
  return (
    rates && [
      formatReturnRate(rates.withoutFocus),
      formatReturnRate(rates.withFocus),
    ]
  );
}

describe("placeReturnRates", () => {
  it("gives a city's base rates and its gear specialty, not its smaller butcher one", () => {
    const rates = ratesAt({ kind: "location", locationId: "1000" });

    expect(shown(rates.base)).toEqual(["15.25%", "43.50%"]);
    expect(shown(rates.specialty)).toEqual(["24.81%", "47.92%"]);
  });

  it("gives a hideout's general rates, and its biome's specialties with map quality", () => {
    const rates = ratesAt({
      kind: "hideout",
      biomeId: "FOREST",
      quality: 6,
      level: 9,
    });

    expect(shown(rates.base)).toEqual(["20.63%", "45.95%"]);
    expect(shown(rates.specialty)).toEqual(["45.05%", "58.51%"]);
  });

  it("has no specialty on the island", () => {
    const rates = ratesAt({ kind: "location", locationId: "island" });

    expect(shown(rates.base)).toEqual(["0.00%", "37.11%"]);
    expect(rates.specialty).toBeUndefined();
  });
});
