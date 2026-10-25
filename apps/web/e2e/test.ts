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
    await respondWith(page, ...defaultRecordedResponses);

    await runTest(page);
  },
});
