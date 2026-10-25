import type { Page } from "@playwright/test";

import { expect, ICON_ORIGIN, test } from "./test";

async function searchFor(page: Page, query: string) {
  await page.goto("./");
  await page.getByRole("searchbox", { name: "Search items" }).fill(query);
  return page
    .getByRole("list", { name: "Matching items" })
    .getByRole("listitem");
}

test("searching lists the matching items with their names and icons", async ({
  page,
}) => {
  const items = await searchFor(page, "Expert broad");

  await expect(items).toHaveText([
    "Expert's Broadsword 5.0",
    "Expert's Broadsword 5.1",
    "Expert's Broadsword 5.2",
    "Expert's Broadsword 5.3",
    "Expert's Broadsword 5.4",
  ]);
  const icon = items.nth(1).locator("img");
  await expect(icon).toHaveAttribute(
    "src",
    `${ICON_ORIGIN}/v1/item/T5_MAIN_SWORD@1.png?quality=1&size=64`,
  );
  await expect
    .poll(() => icon.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBeGreaterThan(0);
});

test("an icon that fails once loads when it's tried again", async ({
  page,
  problems,
}) => {
  let requests = 0;
  await page.route(
    (url) => url.origin === ICON_ORIGIN,
    async (route) => {
      requests += 1;
      await (requests === 1
        ? route.fulfill({ status: 502, body: "" })
        : route.fallback());
    },
  );

  const items = await searchFor(page, "broadsword 5.1");
  const icon = items.locator("img");

  await expect.poll(() => requests).toBe(2);
  await expect(icon).toHaveAttribute(
    "src",
    `${ICON_ORIGIN}/v1/item/T5_MAIN_SWORD@1.png?quality=1&size=64`,
  );
  await expect
    .poll(() => icon.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBeGreaterThan(0);
  await expect
    .poll(() => problems)
    .toEqual([
      "Failed to load resource: the server responded with a status of 502 (Bad Gateway)",
    ]);
  problems.splice(0);
});

test("an icon that keeps failing shows a placeholder after three tries", async ({
  page,
  problems,
}) => {
  await page.route(
    (url) => url.origin === ICON_ORIGIN,
    (route) => route.fulfill({ status: 404, body: "" }),
  );

  const items = await searchFor(page, "broadsword 5.1");

  await expect(items.locator("img")).toHaveAttribute(
    "src",
    /^data:image\/svg\+xml,/,
  );
  const failed =
    "Failed to load resource: the server responded with a status of 404 (Not Found)";
  await expect
    .poll(() => problems, { timeout: 10_000 })
    .toEqual([failed, failed, failed]);
  problems.splice(0);
});
