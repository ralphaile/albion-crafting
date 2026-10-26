import { expect, test as base } from "@playwright/test";
import type { Page, Route } from "@playwright/test";

import history from "@aoc/market-prices/fixtures/history.json" with { type: "json" };
import pricesNoData from "@aoc/market-prices/fixtures/prices-no-data.json" with { type: "json" };
import prices from "@aoc/market-prices/fixtures/prices.json" with { type: "json" };

export { expect } from "@playwright/test";

interface RecordedResponse {
  request: string;
  status: number;
  headers: Record<string, string>;
  body: unknown;
}

export const ICON_ORIGIN = "https://render.albiononline.com";

const STAND_IN_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"></svg>';

export const defaultRecordedResponses: RecordedResponse[] = [
  prices,
  history,
  pricesNoData,
];

function requestLine(route: Route) {
  return `${route.request().method()} ${route.request().url()}`;
}

export interface FakePrice {
  itemId: string;
  marketId: string;
  quality?: number;
  sellMin?: number;
  buyMax?: number;
  ageMinutes?: number;
}

const NO_DATA_DATE = "0001-01-01T00:00:00";

const AODP_PRICES =
  /^https:\/\/[a-z]+\.albion-online-data\.com\/api\/v2\/stats\/prices\/([^/]+)\.json$/;

function aodpDate(ageMinutes: number) {
  return new Date(Date.now() - ageMinutes * 60_000).toISOString().slice(0, 19);
}

function aodpPriceRow(
  itemId: string,
  marketId: string,
  quality: number,
  price: FakePrice | undefined,
) {
  const date = aodpDate(price?.ageMinutes ?? 30);
  const sell = price?.sellMin ?? 0;
  const buy = price?.buyMax ?? 0;
  const sellDate = sell === 0 ? NO_DATA_DATE : date;
  const buyDate = buy === 0 ? NO_DATA_DATE : date;
  return {
    item_id: itemId,
    city: marketId,
    quality,
    sell_price_min: sell,
    sell_price_min_date: sellDate,
    sell_price_max: sell,
    sell_price_max_date: sellDate,
    buy_price_min: buy,
    buy_price_min_date: buyDate,
    buy_price_max: buy,
    buy_price_max_date: buyDate,
  };
}

export async function answerPrices(page: Page, prices: readonly FakePrice[]) {
  await page.route(
    (url) => AODP_PRICES.test(url.origin + url.pathname),
    async (route) => {
      const url = new URL(route.request().url());
      const [, path = ""] = AODP_PRICES.exec(url.origin + url.pathname) ?? [];
      const marketIds = (url.searchParams.get("locations") ?? "").split(",");
      const qualities = (url.searchParams.get("qualities") ?? "1")
        .split(",")
        .map(Number);
      const rows = path
        .split(",")
        .map(decodeURIComponent)
        .flatMap((itemId) =>
          marketIds.flatMap((marketId) =>
            qualities.map((quality) =>
              aodpPriceRow(
                itemId,
                marketId,
                quality,
                prices.find(
                  (price) =>
                    price.itemId === itemId &&
                    price.marketId === marketId &&
                    (price.quality ?? 1) === quality,
                ),
              ),
            ),
          ),
        );
      await route.fulfill({ json: rows });
    },
  );
}

export async function respondWith(
  page: Page,
  ...recordedResponses: RecordedResponse[]
) {
  const responsesByRequest = new Map(
    recordedResponses.map((recorded) => [recorded.request, recorded]),
  );

  await page.route("**", async (route) => {
    const recorded = responsesByRequest.get(requestLine(route));
    if (recorded === undefined) {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: recorded.status,
      headers: recorded.headers,
      body:
        typeof recorded.body === "string"
          ? recorded.body
          : JSON.stringify(recorded.body),
    });
  });
}

export const test = base.extend<{ problems: string[] }>({
  problems: async ({}, runTest) => {
    const problems: string[] = [];

    await runTest(problems);

    expect(
      problems,
      "console errors and requests without a recorded response",
    ).toEqual([]);
  },

  page: async ({ page, baseURL, problems }, runTest) => {
    const appOrigin = new URL(baseURL!).origin;

    page.on("console", (message) => {
      if (message.type() === "error") {
        problems.push(message.text());
      }
    });
    page.on("pageerror", (error) => {
      problems.push(error.message);
    });

    await page.route(
      (url) => url.origin !== appOrigin,
      async (route) => {
        problems.push(`${requestLine(route)} has no recorded response`);
        await route.abort("blockedbyclient");
      },
    );
    await page.route(
      (url) => url.origin === ICON_ORIGIN,
      (route) =>
        route.fulfill({ contentType: "image/svg+xml", body: STAND_IN_ICON }),
    );
    await answerPrices(page, []);
    await respondWith(page, ...defaultRecordedResponses);

    await runTest(page);
  },
});
