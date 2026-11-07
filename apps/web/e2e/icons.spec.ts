import type { Page } from "@playwright/test";

import { expect, ICON_ORIGIN, test } from "./test";

const SITE_ICON = /\/albion-crafting\/icons\/T5_MAIN_SWORD@1\.png$/;
const RENDER_ICON = `${ICON_ORIGIN}/v1/item/T5_MAIN_SWORD@1.png?quality=1&size=64`;

async function broadswordIcon(page: Page) {
  await page.goto(`./?${new URLSearchParams({ q: "broadsword 5.1" })}`);
  const rows = page.getByRole("rowheader");
  await expect(rows).toHaveText([/^Expert's Broadsword5\.1/]);
  return rows.locator("img");
}

function loaded(icon: Awaited<ReturnType<typeof broadswordIcon>>) {
  return expect
    .poll(() => icon.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBeGreaterThan(0);
}

test("each craft shows its item's icon from the site", async ({ page }) => {
  const icon = await broadswordIcon(page);

  await expect(icon).toHaveAttribute("src", SITE_ICON);
  await loaded(icon);
});

test("an icon the site doesn't have loads from the render service", async ({
  page,
  problems,
}) => {
  await page.route(SITE_ICON, (route) =>
    route.fulfill({ status: 404, body: "" }),
  );

  const icon = await broadswordIcon(page);

  await expect(icon).toHaveAttribute("src", RENDER_ICON);
  await loaded(icon);
  await expect
    .poll(() => problems)
    .toEqual([
      "Failed to load resource: the server responded with a status of 404 (Not Found)",
    ]);
  problems.splice(0);
});

test("an icon that keeps failing shows a placeholder after the site and three tries of the render service", async ({
  page,
  problems,
}) => {
  await page.route(SITE_ICON, (route) =>
    route.fulfill({ status: 404, body: "" }),
  );
  await page.route(
    (url) => url.href === RENDER_ICON,
    (route) => route.fulfill({ status: 502, body: "" }),
  );

  const icon = await broadswordIcon(page);

  await expect(icon).toHaveAttribute("src", /^data:image\/svg\+xml,/);
  const notFound =
    "Failed to load resource: the server responded with a status of 404 (Not Found)";
  const badGateway =
    "Failed to load resource: the server responded with a status of 502 (Bad Gateway)";
  await expect
    .poll(() => problems, { timeout: 10_000 })
    .toEqual([notFound, badGateway, badGateway, badGateway]);
  problems.splice(0);
});
