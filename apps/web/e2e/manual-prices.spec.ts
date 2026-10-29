import { answerPrices, expect, test } from "./test";

test("typing a missing artifact price completes its craft, and it's still there next visit", async ({
  page,
}) => {
  await answerPrices(page, [
    { itemId: "T4_METALBAR", marketId: "Lymhurst", sellMin: 100 },
    { itemId: "T4_LEATHER", marketId: "Lymhurst", sellMin: 50 },
    {
      itemId: "T4_MAIN_SCIMITAR_MORGANA",
      marketId: "Lymhurst",
      sellMin: 30_000,
    },
  ]);
  await page.goto("./?tier=4&enchant=0&q=clarent");
  const row = page
    .getByRole("region", { name: "Best crafts" })
    .getByRole("row")
    .filter({ hasText: "Adept's Clarent Blade" });

  await row.getByRole("button", { name: "1 price missing" }).click();
  const panel = page.getByRole("dialog", { name: "Adept's Clarent Blade 4.0" });
  const artifact = panel.getByRole("textbox", {
    name: "Adept's Bloodforged Blade 4.0, sell order in Lymhurst",
  });
  await expect(artifact).toHaveAccessibleDescription(
    "Sell order · Lymhurst · missing",
  );
  await artifact.fill("12000");
  await artifact.press("Enter");
  await expect(artifact).toHaveAccessibleDescription(
    "Sell order · Lymhurst · typed just now",
  );
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();

  // Adept's Clarent Blade in Lymhurst with focus, item value 480:
  //   materials     16 bars and 8 leather, 2,000 × (1 − 0.92/1.92) = 1,041.67,
  //                 plus the artifact, which never returns: 13,041.67
  //   station fee   480 × 0.1125 × 500 / 100 = 270
  //   revenue       30,000 − 4% tax − 2.5% setup fee = 28,050
  //   profit        28,050 − 13,041.67 − 270 = 14,738.33, a 110.7% margin
  //   without focus the bars and leather cost 1,503.76, so focus saves
  //   462.09 silver for 1,286 focus: 0.36 silver per focus
  const cells = row.getByRole("cell");
  await expect(cells).toHaveText([
    "14,738",
    "110.7%",
    "0.4",
    "13,042",
    "28,050",
    "47.9%",
    /item 30 min.*materials 30 min/,
  ]);

  await page.reload();

  await expect(cells.first()).toHaveText("14,738");
  await row
    .getByRole("button", { name: "Prices for Adept's Clarent Blade 4.0" })
    .click();
  await expect(artifact).toHaveValue("12000");
});
