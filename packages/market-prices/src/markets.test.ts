import { describe, expect, it } from "vitest";

import { markets } from "./index.js";

function names(list: readonly { name: string }[]): string[] {
  return list.map(({ name }) => name);
}

describe("markets", () => {
  it("lists the cities, the Black Market and the Rests", () => {
    expect(names(markets)).toEqual([
      "Bridgewatch",
      "Brecilien",
      "Caerleon",
      "Fort Sterling",
      "Lymhurst",
      "Martlock",
      "Thetford",
      "Black Market",
      "Arthur's Rest",
      "Merlyn's Rest",
      "Morgana's Rest",
    ]);
  });

  it("uses AODP's names for the Rests' markets", () => {
    expect(
      markets.filter(({ name }) => name.endsWith(" Rest")).map(({ id }) => id),
    ).toEqual([
      "Arthurs Rest Smugglers Network",
      "Merlyns Rest Smugglers Network",
      "Morganas Rest Smugglers Network",
    ]);
  });

  it("marks only the Black Market as sell-only, and only the Rests as having sparse data", () => {
    expect(names(markets.filter(({ sellOnly }) => sellOnly))).toEqual([
      "Black Market",
    ]);
    expect(names(markets.filter(({ sparseData }) => sparseData))).toEqual([
      "Arthur's Rest",
      "Merlyn's Rest",
      "Morgana's Rest",
    ]);
  });
});
