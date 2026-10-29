import { describe, expect, it } from "vitest";

import { choosePrice, type DatedPrice } from "./index.js";

const HOUR_MS = 3_600_000;
const NOW = Date.UTC(2026, 9, 28, 12);

function seen(status: DatedPrice["status"], hoursAgo: number): DatedPrice {
  return { status, value: 1000, observedAt: NOW - hoursAgo * HOUR_MS };
}

const MISSING = { status: "missing" } as const;

describe("choosePrice", () => {
  it("uses the API's price when there is no manual one, even a missing one", () => {
    expect(
      choosePrice(seen("fresh", 1), undefined, { preferManual: false }),
    ).toBe("api");
    expect(choosePrice(MISSING, undefined, { preferManual: true })).toBe("api");
  });

  it("uses the manual price when the API's is missing, even a stale one", () => {
    expect(
      choosePrice(MISSING, seen("stale", 100), { preferManual: false }),
    ).toBe("manual");
  });

  it.each([
    ["the newer manual price over the API's", 2, 1, "manual"],
    ["the newer API price over the manual one", 1, 2, "api"],
    ["the API's price when both were seen at the same time", 1, 1, "api"],
  ] as const)(
    "among fresh prices, uses %s",
    (_case, apiHoursAgo, manualHoursAgo, expected) => {
      expect(
        choosePrice(seen("fresh", apiHoursAgo), seen("fresh", manualHoursAgo), {
          preferManual: false,
        }),
      ).toBe(expected);
    },
  );

  it("uses a fresh manual price over a stale API price, even an older one", () => {
    expect(
      choosePrice(seen("stale", 13), seen("fresh", 48), {
        preferManual: false,
      }),
    ).toBe("manual");
  });

  it("uses a fresh API price over a stale manual price", () => {
    expect(
      choosePrice(seen("fresh", 1), seen("stale", 100), {
        preferManual: false,
      }),
    ).toBe("api");
  });

  it("uses the newer of two stale prices", () => {
    expect(
      choosePrice(seen("stale", 20), seen("stale", 100), {
        preferManual: false,
      }),
    ).toBe("api");
    expect(
      choosePrice(seen("stale", 100), seen("stale", 80), {
        preferManual: false,
      }),
    ).toBe("manual");
  });

  it("always uses the manual price when manual prices are preferred, even a stale one", () => {
    expect(
      choosePrice(seen("fresh", 1), seen("fresh", 5), { preferManual: true }),
    ).toBe("manual");
    expect(
      choosePrice(seen("fresh", 1), seen("stale", 100), { preferManual: true }),
    ).toBe("manual");
  });
});
