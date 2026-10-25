import type { Page } from "@playwright/test";

import history from "@aoc/market-prices/fixtures/history.json" with { type: "json" };
import rateLimited from "@aoc/market-prices/fixtures/rate-limited.json" with { type: "json" };

import {
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
