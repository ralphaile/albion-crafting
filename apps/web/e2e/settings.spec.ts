import { answerPrices, expect, test } from "./test";

test("turning focus off re-ranks without focus, and stays off next visit", async ({
  page,
}) => {
  await answerPrices(page, [
    { itemId: "T4_METALBAR", marketId: "Lymhurst", sellMin: 100 },
    { itemId: "T4_LEATHER", marketId: "Lymhurst", sellMin: 50 },
    { itemId: "T4_MAIN_SWORD", marketId: "Lymhurst", sellMin: 5000 },
  ]);
  await page.goto("./");
  const table = page.getByRole("region", { name: "Best crafts" });
  const silverPerFocus = table.getByRole("columnheader", {
    name: "Silver/focus",
  });
  const topRow = table.getByRole("row").nth(1);
  await expect(silverPerFocus).toBeVisible();

  await page.getByRole("button", { name: "Settings" }).click();
  const settings = page.getByRole("dialog", { name: "Settings" });
  await settings.getByRole("checkbox", { name: "Use focus" }).uncheck();
  await page.keyboard.press("Escape");

  // Adept's Broadsword in Lymhurst without focus:
  //   return rate   (0.18 city + 0.15 sword) / 1.33 = 24.8%
  //   materials     2,000 × (1 − 0.33/1.33) = 1,503.76
  //   profit        4,675 revenue − 1,503.76 − 216 station fee = 2,955.24,
  //   a 171.8% margin on 1,719.76
  await expect(settings).toBeHidden();
  await expect(silverPerFocus).toBeHidden();
  await expect(topRow.getByRole("cell")).toHaveText([
    "2,955",
    "171.8%",
    "1,504",
    "4,675",
    "24.8%",
    /item 30 min.*materials 30 min/,
  ]);

  await page.reload();

  await expect(topRow.getByRole("cell").first()).toHaveText("2,955");
  await expect(silverPerFocus).toBeHidden();
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(
    settings.getByRole("checkbox", { name: "Use focus" }),
  ).not.toBeChecked();
});

test("asks the chosen server for prices", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Settings" }).click();

  const europe = page.waitForRequest(
    /^https:\/\/europe\.albion-online-data\.com\//,
  );
  await page
    .getByRole("dialog", { name: "Settings" })
    .getByRole("combobox", { name: "Server" })
    .selectOption("Europe");

  await europe;
});
