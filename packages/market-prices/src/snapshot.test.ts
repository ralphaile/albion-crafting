import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { fetchPriceSnapshots, snapshotPath } from "./index.js";
import { toSnapshots } from "./snapshot.helpers.js";
import type { PriceSnapshot } from "./snapshot.types.js";
import { server } from "../test/setup.js";

const NO_DATA = "0001-01-01T00:00:00";
const SEEN = "2026-10-26T11:45:00";

function row(
  itemId: string,
  city: string,
  { sell = 0, buy = 0, quality = 1 } = {},
) {
  return {
    item_id: itemId,
    city,
    quality,
    sell_price_min: sell,
    sell_price_min_date: sell === 0 ? NO_DATA : SEEN,
    sell_price_max: 0,
    sell_price_max_date: NO_DATA,
    buy_price_min: 0,
    buy_price_min_date: NO_DATA,
    buy_price_max: buy,
    buy_price_max_date: buy === 0 ? NO_DATA : SEEN,
  };
}

describe("snapshotPath", () => {
  it("names a file after the server and market, in lower case without spaces", () => {
    expect(snapshotPath("europe", "Black Market")).toBe(
      "europe/black-market.json",
    );
    expect(snapshotPath("west", "Arthurs Rest Smugglers Network")).toBe(
      "west/arthurs-rest-smugglers-network.json",
    );
  });
});

describe("toSnapshots", () => {
  it("groups the rows by market, and leaves out items with no orders and other qualities", () => {
    expect(
      toSnapshots(
        [
          row("T4_BAG", "Caerleon", { sell: 900, buy: 800 }),
          row("T5_BAG", "Caerleon"),
          row("T4_BAG", "Lymhurst", { buy: 700 }),
          row("T4_BAG", "Lymhurst", { sell: 5000, quality: 2 }),
        ],
        1000,
      ),
    ).toEqual(
      new Map([
        [
          "Caerleon",
          { fetchedAt: 1000, rows: [["T4_BAG", 900, SEEN, 800, SEEN]] },
        ],
        [
          "Lymhurst",
          { fetchedAt: 1000, rows: [["T4_BAG", 0, NO_DATA, 700, SEEN]] },
        ],
      ]),
    );
  });
});

describe("fetchPriceSnapshots", () => {
  it("asks for every market at quality 1, and keeps the last rows of the items AODP can't answer for", async () => {
    // So long that each one needs its own request.
    const answeredId = `T4_BAG_${"X".repeat(3000)}`;
    const failingId = `T5_BAG_${"X".repeat(3000)}`;
    const asked: string[] = [];
    server.use(
      http.get(
        "https://east.albion-online-data.com/api/v2/stats/prices/*",
        ({ request }) => {
          const url = new URL(request.url);
          asked.push(decodeURIComponent(url.search));
          if (url.pathname.includes("T5_BAG")) {
            return new HttpResponse(null, { status: 503 });
          }
          return HttpResponse.json([
            row(answeredId, "Caerleon", { sell: 900 }),
          ]);
        },
      ),
    );
    const last: PriceSnapshot = {
      fetchedAt: 0,
      rows: [
        [answeredId, 1, SEEN, 0, NO_DATA],
        [failingId, 1800, SEEN, 0, NO_DATA],
      ],
    };

    const { snapshots, failures } = await fetchPriceSnapshots(
      [answeredId, failingId],
      "east",
      {
        lastSnapshot: (region, marketId) =>
          Promise.resolve(
            region === "east" && marketId === "Caerleon" ? last : undefined,
          ),
      },
    );

    expect(asked[0]).toContain("qualities=1");
    expect(asked[0]).toContain("Black Market");
    expect(failures).toHaveLength(1);
    expect(snapshots.get("Caerleon")?.rows).toEqual([
      [answeredId, 900, SEEN, 0, NO_DATA],
      [failingId, 1800, SEEN, 0, NO_DATA],
    ]);
  });
});
