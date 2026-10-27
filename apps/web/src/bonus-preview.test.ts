import { describe, expect, it } from "vitest";

import { bonusPreview } from "./bonus-preview.helpers";
import type { BonusRow } from "./bonus-preview.types";
import { formatBonus, formatReturnRate } from "./format.helpers";
import { routeFromChoice } from "./route.helpers";
import type { PlaceChoice } from "./route.types";

function previewAt(place: PlaceChoice) {
  return bonusPreview(
    routeFromChoice({
      place,
      buyMarketId: "Lymhurst",
      sellMarketId: "Lymhurst",
    }).place,
  );
}

function shown(row: BonusRow | undefined) {
  return (
    row && [
      formatBonus(row.bonus),
      formatReturnRate(row.returnRate),
      formatBonus(row.bonusWithFocus),
      formatReturnRate(row.returnRateWithFocus),
    ]
  );
}

describe("bonusPreview", () => {
  it("shows a city's base bonus and its gear specialty, not its smaller butcher one", () => {
    const preview = previewAt({ kind: "location", locationId: "1000" });

    expect(shown(preview.base)).toEqual(["18%", "15.25%", "77%", "43.50%"]);
    expect(shown(preview.specialty)).toEqual([
      "33%",
      "24.81%",
      "92%",
      "47.92%",
    ]);
  });

  it("shows a hideout's general bonus, and its biome's specialties with map quality", () => {
    const preview = previewAt({
      kind: "hideout",
      biomeId: "FOREST",
      quality: 6,
      level: 9,
    });

    expect(shown(preview.base)).toEqual(["26%", "20.63%", "85%", "45.95%"]);
    expect(shown(preview.specialty)).toEqual([
      "82%",
      "45.05%",
      "141%",
      "58.51%",
    ]);
  });

  it("has no specialty on the island", () => {
    const preview = previewAt({ kind: "location", locationId: "island" });

    expect(shown(preview.base)).toEqual(["0%", "0.00%", "59%", "37.11%"]);
    expect(preview.specialty).toBeUndefined();
  });
});
