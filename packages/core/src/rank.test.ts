import { describe, expect, it } from "vitest";

import {
  defaultSortKey,
  evaluate,
  type Evaluation,
  rank,
  type SortKey,
} from "./index.js";

const template = evaluate(
  {
    itemId: "T4_MAIN_SWORD",
    focus: 0,
    silver: 0,
    amountCrafted: 1,
    materials: [],
    alternatives: [],
  },
  {
    location: {
      id: "island",
      name: "Island",
      craftingBonus: 0,
      specialties: {},
    },
  },
  {
    focus: false,
    premium: true,
    buyMode: "instant",
    sellMode: "instant",
    stationFee: 0,
  },
  {
    materials: new Map(),
    products: new Map([
      [
        "T4_MAIN_SWORD",
        { sellMin: { status: "missing" }, buyMax: { status: "missing" } },
      ],
    ]),
  },
);

function complete(
  itemId: string,
  profit: number,
  margin?: number,
  silverPerFocus?: number,
): Evaluation {
  return {
    ...template,
    itemId,
    status: "complete",
    profit,
    margin,
    ...(silverPerFocus === undefined ? {} : { silverPerFocus }),
  };
}

function incomplete(itemId: string): Evaluation {
  return { ...template, itemId, status: "incomplete" };
}

const ids = (results: readonly Evaluation[]) =>
  results.map(({ itemId }) => itemId);

describe("rank", () => {
  const results = [
    incomplete("A"),
    complete("B", 1000, 0.1, 2),
    complete("C", 5000, 0.05, 8),
    incomplete("D"),
    complete("E", -200, -0.01),
    complete("F", 3000, undefined, 5),
  ];

  it.each<[SortKey, string[]]>([
    ["profit", ["C", "F", "B", "E", "A", "D"]],
    ["margin", ["B", "C", "E", "F", "A", "D"]],
    ["silverPerFocus", ["C", "F", "B", "E", "A", "D"]],
  ])(
    "sorts by %s, highest first, with results lacking it after the rest and incomplete ones last",
    (sortKey, expected) => {
      expect(ids(rank(results, sortKey))).toEqual(expected);
    },
  );

  it("keeps the order of results that tie", () => {
    expect(
      ids(rank([complete("X", 100), complete("Y", 100)], "profit")),
    ).toEqual(["X", "Y"]);
  });

  it("returns the results it was given, with anything added to them", () => {
    const named = [
      { ...complete("B", 1000), name: "Broadsword" },
      { ...complete("C", 5000), name: "Claymore" },
    ];

    expect(rank(named, "profit").map(({ name }) => name)).toEqual([
      "Claymore",
      "Broadsword",
    ]);
  });

  it("leaves the results it was given as they were", () => {
    const given = [complete("B", 1000), complete("C", 5000)];

    rank(given, "profit");

    expect(ids(given)).toEqual(["B", "C"]);
  });
});

describe("defaultSortKey", () => {
  it("sorts by silver per focus with focus, and by profit without", () => {
    expect(defaultSortKey(true)).toBe("silverPerFocus");
    expect(defaultSortKey(false)).toBe("profit");
  });
});
