import { describe, expect, it } from "vitest";

import { REFINING_CITY_MARKETS } from "./material-markets.constants";
import {
  byMaterialMarket,
  everyMaterialIn,
  materialMarketId,
} from "./material-markets.helpers";
import { NO_PINS } from "./material-pins.constants";

const markets = {
  buyMarketId: "Caerleon",
  materialMarkets: REFINING_CITY_MARKETS,
  pins: NO_PINS,
};

describe("REFINING_CITY_MARKETS", () => {
  it("buys each refined material in the city with the refining bonus for it", () => {
    expect(REFINING_CITY_MARKETS).toEqual({
      metalbars: "Thetford",
      planks: "Fort Sterling",
      cloth: "Lymhurst",
      leather: "Martlock",
    });
  });
});

describe("materialMarketId", () => {
  it.each([
    ["metal bars", "T5_METALBAR_LEVEL2@2", "Thetford"],
    ["planks", "T4_PLANKS", "Fort Sterling"],
    ["cloth", "T8_CLOTH", "Lymhurst"],
    ["leather", "T6_LEATHER_LEVEL1@1", "Martlock"],
    ["stone blocks", "T4_STONEBLOCK", "Caerleon"],
    ["raw ore", "T4_ORE", "Caerleon"],
    ["an artifact", "T4_ARTEFACT_MAIN_SCIMITAR_MORGANA", "Caerleon"],
  ])("buys %s in their market", (_case, itemId, marketId) => {
    expect(materialMarketId(markets, itemId)).toBe(marketId);
  });

  it("buys a pinned material in its pinned market, refined or not", () => {
    const pinned = {
      ...markets,
      pins: { T4_METALBAR: "Bridgewatch", T4_ORE: "Martlock" },
    };

    expect(materialMarketId(pinned, "T4_METALBAR")).toBe("Bridgewatch");
    expect(materialMarketId(pinned, "T4_ORE")).toBe("Martlock");
    expect(materialMarketId(pinned, "T5_METALBAR")).toBe("Thetford");
  });
});

describe("byMaterialMarket", () => {
  it("groups the items by market, in the order each market comes up", () => {
    expect([
      ...byMaterialMarket(
        { ...markets, materialMarkets: everyMaterialIn("Martlock") },
        [
          "T4_ORE",
          "T4_METALBAR",
          "T4_ARTEFACT_MAIN_SCIMITAR_MORGANA",
          "T4_CLOTH",
        ],
      ),
    ]).toEqual([
      ["Caerleon", ["T4_ORE", "T4_ARTEFACT_MAIN_SCIMITAR_MORGANA"]],
      ["Martlock", ["T4_METALBAR", "T4_CLOTH"]],
    ]);
  });
});
