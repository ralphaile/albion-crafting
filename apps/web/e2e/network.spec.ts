import type { Page } from "@playwright/test";

import history from "@aoc/market-prices/fixtures/history.json" with { type: "json" };
import rateLimited from "@aoc/market-prices/fixtures/rate-limited.json" with { type: "json" };

import {
  answerPrices,
  defaultRecordedResponses,
  expect,
  ICON_ORIGIN,
  respondWith,
  test,
} from "./test";

function urlOf(request: string) {
  return request.replace(/^GET /, "");
}

async function fetchInPage(page: Page, url: string) {
  return page.evaluate(async (target) => {
    const response = await fetch(target);
    return { status: response.status, body: await response.text() };
  }, url);
}

test("blocks a request without a recorded response", async ({
  page,
  problems,
}) => {
  const url = "https://aodp.invalid/api/v2/stats/prices/T4_BAG.json";
  await page.goto("./");

  const outcome = await page.evaluate(async (target) => {
    try {
      await fetch(target);
      return "answered";
    } catch {
      return "failed";
    }
  }, url);

  expect(outcome).toBe("failed");
  expect(problems.splice(0)).toContain(`GET ${url} has no recorded response`);
});

for (const recorded of defaultRecordedResponses) {
  const url = urlOf(recorded.request);

  test(`answers ${new URL(url).pathname} from its recording`, async ({
    page,
  }) => {
    await page.goto("./");

    expect(await fetchInPage(page, url)).toEqual({
      status: recorded.status,
      body: JSON.stringify(recorded.body),
    });
  });
}

async function fetchPrices(page: Page, url: string) {
  const { status, body } = await fetchInPage(page, url);
  expect(status).toBe(200);
  return JSON.parse(body) as Record<string, unknown>[];
}

const noData = {
  sell_price_min: 0,
  sell_price_min_date: "0001-01-01T00:00:00",
  buy_price_max: 0,
  buy_price_max_date: "0001-01-01T00:00:00",
};

test("answers a price request without a recording with no data", async ({
  page,
}) => {
  await page.goto("./");

  const rows = await fetchPrices(
    page,
    "https://west.albion-online-data.com/api/v2/stats/prices/T4_MAIN_SWORD,T5_BAG@1.json?locations=Lymhurst,Black%20Market&qualities=1,2",
  );

  expect(
    rows.map(({ item_id, city, quality }) => [item_id, city, quality]),
  ).toEqual([
    ["T4_MAIN_SWORD", "Lymhurst", 1],
    ["T4_MAIN_SWORD", "Lymhurst", 2],
    ["T4_MAIN_SWORD", "Black Market", 1],
    ["T4_MAIN_SWORD", "Black Market", 2],
    ["T5_BAG@1", "Lymhurst", 1],
    ["T5_BAG@1", "Lymhurst", 2],
    ["T5_BAG@1", "Black Market", 1],
    ["T5_BAG@1", "Black Market", 2],
  ]);
  for (const row of rows) {
    expect(row).toMatchObject(noData);
  }
});

test("answerPrices answers with the prices it's given, seen that long ago", async ({
  page,
}) => {
  await answerPrices(page, [
    {
      itemId: "T4_METALBAR",
      marketId: "Lymhurst",
      sellMin: 100,
      buyMax: 90,
      ageMinutes: 30,
    },
  ]);
  await page.goto("./");

  const [bars, leather] = await fetchPrices(
    page,
    "https://europe.albion-online-data.com/api/v2/stats/prices/T4_METALBAR,T4_LEATHER.json?locations=Lymhurst&qualities=1",
  );

  expect(bars).toMatchObject({ sell_price_min: 100, buy_price_max: 90 });
  const seenAt = Date.parse(`${String(bars?.sell_price_min_date)}Z`);
  expect(Date.now() - seenAt).toBeGreaterThanOrEqual(30 * 60_000);
  expect(Date.now() - seenAt).toBeLessThan(31 * 60_000);
  expect(leather).toMatchObject({ item_id: "T4_LEATHER", ...noData });
});

test("answers item icons with a stand-in image", async ({ page }) => {
  await page.goto("./");

  const icon = await page.evaluate(async (target) => {
    const response = await fetch(target);
    return {
      status: response.status,
      type: response.headers.get("content-type"),
    };
  }, `${ICON_ORIGIN}/v1/item/T4_BAG.png?quality=1&size=64`);

  expect(icon).toEqual({ status: 200, type: "image/svg+xml" });
});

test("respondWith replaces the recorded response for the same request", async ({
  page,
  problems,
}) => {
  await respondWith(page, rateLimited);
  await page.goto("./");

  expect(await fetchInPage(page, urlOf(rateLimited.request))).toEqual({
    status: 429,
    body: rateLimited.body,
  });
  expect(await fetchInPage(page, urlOf(history.request))).toEqual({
    status: 200,
    body: JSON.stringify(history.body),
  });
  expect(problems.splice(0)).toEqual([
    "Failed to load resource: the server responded with a status of 429 (Too Many Requests)",
  ]);
});
