import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { createAodpClient } from "./index.js";
import pricesNoData from "../test/fixtures/prices-no-data.json" with { type: "json" };
import prices from "../test/fixtures/prices.json" with { type: "json" };
import rateLimited from "../test/fixtures/rate-limited.json" with { type: "json" };
import { server } from "../test/setup.js";

const PRICES = "https://*.albion-online-data.com/api/v2/stats/prices/*";
const NO_DATA = "0001-01-01T00:00:00";
const EMPTY_URL =
  "https://west.albion-online-data.com/api/v2/stats/prices/.json?locations=Caerleon&qualities=1";

const client = createAodpClient();

function serve(rows: object[]): string[] {
  const requested: string[] = [];
  server.use(
    http.get(PRICES, ({ request }) => {
      requested.push(request.url);
      return HttpResponse.json(rows);
    }),
  );
  return requested;
}

function urlOf(recorded: { request: string }): string {
  return recorded.request.replace(/^GET /, "");
}

function askedIds(url: string): string[] {
  const path = new URL(url).pathname;
  return path.slice(path.lastIndexOf("/") + 1, -".json".length).split(",");
}

function priceAt(city: string) {
  return {
    item_id: "T4_BAG",
    city,
    quality: 1,
    sell_price_min: 0,
    sell_price_min_date: NO_DATA,
    sell_price_max: 0,
    sell_price_max_date: NO_DATA,
    buy_price_min: 0,
    buy_price_min_date: NO_DATA,
    buy_price_max: 0,
    buy_price_max_date: NO_DATA,
  };
}

// 11-character IDs, with the last one padded so the URL is exactly `length` long
function idsFillingUrl(length: number, emptyUrl = EMPTY_URL): string[] {
  const room = length - emptyUrl.length;
  const count = Math.floor((room + 1) / 12) - 1;
  const ids = Array.from(
    { length: count },
    (_, index) => `T4_ITEM_${String(index).padStart(3, "0")}`,
  );
  return [...ids, `T4_LAST${"X".repeat(room - 12 * count - 7)}`];
}

describe("getPrices", () => {
  it("asks the west server, as the recorded request did", async () => {
    const requested = serve(prices.body);

    await expect(
      client.getPrices(["T4_BAG", "T5_BAG"], ["Caerleon", "Lymhurst"], [1]),
    ).resolves.toEqual(prices.body);

    expect(requested).toEqual([urlOf(prices)]);
  });

  it.each(["europe", "east"] as const)(
    "asks the %s server when picked",
    async (region) => {
      const requested = serve([]);

      await createAodpClient({ region }).getPrices(
        ["T4_BAG"],
        ["Caerleon"],
        [1],
      );

      expect(requested).toEqual([
        EMPTY_URL.replace("west", region).replace("/.json", "/T4_BAG.json"),
      ]);
    },
  );

  it("keeps the @ of enchanted items and accepts prices with no data", async () => {
    const requested = serve(pricesNoData.body);

    await expect(
      client.getPrices(["T8_BAG_INSIGHT@4"], ["Thetford"], [5]),
    ).resolves.toEqual(pricesNoData.body);

    expect(requested).toEqual([urlOf(pricesNoData)]);
  });

  it("encodes market names with spaces and apostrophes", async () => {
    const requested = serve([]);

    await client.getPrices(["T4_BAG"], ["Fort Sterling", "Arthur's Rest"], [1]);

    expect(requested).toEqual([
      "https://west.albion-online-data.com/api/v2/stats/prices/T4_BAG.json?locations=Fort%20Sterling,Arthur%27s%20Rest&qualities=1",
    ]);
  });

  it("returns only the markets it asked for, matching names in any case", async () => {
    serve(
      [
        "Arthurs Rest Smugglers Network",
        "Deepwood Copse Smugglers Network",
        "0",
        "Caerleon",
      ].map(priceAt),
    );

    const result = await client.getPrices(
      ["T4_BAG"],
      ["Arthurs Rest Smugglers Network", "Arthur's Rest", "caerleon"],
      [1],
    );

    expect(result.map(({ city }) => city)).toEqual([
      "Arthurs Rest Smugglers Network",
      "Caerleon",
    ]);
  });

  it("asks for all the items in one request when the URL is exactly 4,096 characters", async () => {
    const requested = serve([]);
    const ids = idsFillingUrl(4096);

    await client.getPrices(ids, ["Caerleon"], [1]);

    expect(requested.map((url) => url.length)).toEqual([4096]);
    expect(requested.flatMap(askedIds)).toEqual(ids);
  });

  it("starts a second request when one more item would go over 4,096 characters", async () => {
    const requested = serve([]);
    const ids = [...idsFillingUrl(4096), "T4_ONE_MORE"];

    await client.getPrices(ids, ["Caerleon"], [1]);

    expect(requested.map((url) => url.length)).toEqual([
      4096,
      EMPTY_URL.length + "T4_ONE_MORE".length,
    ]);
    expect(requested.flatMap(askedIds)).toEqual(ids);
  });

  it("counts an apostrophe as the 3 characters fetch sends for it", async () => {
    const requested = serve([]);
    const ids = idsFillingUrl(
      4097,
      "https://west.albion-online-data.com/api/v2/stats/prices/.json?locations=Arthur%27s%20Rest&qualities=1",
    );

    await client.getPrices(ids, ["Arthur's Rest"], [1]);

    expect(requested).toHaveLength(2);
    expect(requested.every((url) => url.length <= 4096)).toBe(true);
  });

  it("asks for each item once", async () => {
    const requested = serve([]);

    await client.getPrices(["T4_BAG", "T5_BAG", "T4_BAG"], ["Caerleon"], [1]);

    expect(requested.flatMap(askedIds)).toEqual(["T4_BAG", "T5_BAG"]);
  });

  it("fails when the markets leave no room for an item", async () => {
    await expect(
      client.getPrices(["T4_BAG"], ["X".repeat(4096)], [1]),
    ).rejects.toThrow(
      "Asking for T4_BAG in these markets and qualities needs a URL longer than 4096 characters",
    );
  });

  it.each([
    { case: "no items", itemIds: [], locations: ["Caerleon"], qualities: [1] },
    { case: "no markets", itemIds: ["T4_BAG"], locations: [], qualities: [1] },
    {
      case: "no qualities",
      itemIds: ["T4_BAG"],
      locations: ["Caerleon"],
      qualities: [],
    },
  ])(
    "returns nothing without a request for $case",
    async ({ itemIds, locations, qualities }) => {
      await expect(
        client.getPrices(itemIds, locations, qualities),
      ).resolves.toEqual([]);
    },
  );

  it("fails with the status when AODP refuses the request", async () => {
    server.use(
      http.get(
        PRICES,
        () =>
          new HttpResponse(rateLimited.body, {
            status: rateLimited.status,
            headers: rateLimited.headers,
          }),
      ),
    );

    await expect(
      client.getPrices(["T4_BAG", "T5_BAG"], ["Caerleon", "Lymhurst"], [1]),
    ).rejects.toThrow(
      `Fetching prices failed: HTTP 429 from ${urlOf(rateLimited)}`,
    );
  });

  it("fails when a row doesn't have the expected fields", async () => {
    serve([{ ...priceAt("Caerleon"), buy_price_max: "17999" }]);

    const error: unknown = await client
      .getPrices(["T4_BAG"], ["Caerleon"], [1])
      .catch((reason: unknown) => reason);

    expect(error).toHaveProperty(
      "message",
      `Fetching prices failed: unexpected fields in the response from ${EMPTY_URL.replace("/.json", "/T4_BAG.json")}`,
    );
    expect(error).toHaveProperty("cause.issues.0.path", [0, "buy_price_max"]);
  });
});
