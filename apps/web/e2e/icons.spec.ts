import type { Page } from "@playwright/test";

import { expect, ICON_ORIGIN, test } from "./test";

const BROADSWORD_ICON = `${ICON_ORIGIN}/v1/item/T5_MAIN_SWORD@1.png?quality=1&size=64`;

async function broadswordIcon(page: Page) {
  await page.goto(`./?${new URLSearchParams({ q: "broadsword 5.1" })}`);
  const rows = page.getByRole("rowheader");
  await expect(rows).toHaveText([/^Expert's Broadsword5\.1/]);
  return rows.locator("img");
}

test("each craft shows its item's icon", async ({ page }) => {
  const icon = await broadswordIcon(page);

  await expect(icon).toHaveAttribute("src", BROADSWORD_ICON);
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
    (url) => url.href === BROADSWORD_ICON,
    async (route) => {
      requests += 1;
      await (requests === 1
        ? route.fulfill({ status: 502, body: "" })
        : route.fallback());
    },
  );

  const icon = await broadswordIcon(page);

  await expect.poll(() => requests).toBe(2);
  await expect(icon).toHaveAttribute("src", BROADSWORD_ICON);
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
    (url) => url.href === BROADSWORD_ICON,
    (route) => route.fulfill({ status: 404, body: "" }),
  );

  const icon = await broadswordIcon(page);

  await expect(icon).toHaveAttribute("src", /^data:image\/svg\+xml,/);
  const failed =
    "Failed to load resource: the server responded with a status of 404 (Not Found)";
  await expect
    .poll(() => problems, { timeout: 10_000 })
    .toEqual([failed, failed, failed]);
  problems.splice(0);
});
