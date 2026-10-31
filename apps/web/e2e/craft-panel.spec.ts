import { answerPrices, expect, test } from "./test";

test("a row opens its craft, and a material price changed there changes the profit", async ({
  page,
}) => {
  await answerPrices(page, [
    { itemId: "T4_METALBAR", marketId: "Lymhurst", sellMin: 100 },
    { itemId: "T4_LEATHER", marketId: "Lymhurst", sellMin: 50 },
    { itemId: "T4_MAIN_SWORD", marketId: "Lymhurst", sellMin: 6000 },
  ]);
  await page.goto("./?tier=4&enchant=0&q=broadsword");
  const row = page
    .getByRole("region", { name: "Best crafts" })
    .getByRole("row")
    .filter({ hasText: "Adept's Broadsword" });
  const profit = row.getByRole("cell").first();

  // Adept's Broadsword in Lymhurst with focus:
  //   materials     16 bars and 8 leather, 2,000 × (1 − 0.92/1.92) = 1,041.67
  //   station fee   384 × 0.1125 × 500 / 100 = 216
  //   revenue       6,000 − 4% tax − 2.5% setup fee = 5,610
  //   profit        5,610 − 1,041.67 − 216 = 4,352.33
  await expect(profit).toHaveText("4,352");
  await row.getByText("Adept's Broadsword").click();
  const panel = page.getByRole("dialog", { name: "Adept's Broadsword 4.0" });
  await expect(panel).toBeVisible();
  await expect(page).toHaveURL(/item=T4_MAIN_SWORD/);

  // Bars at 200 add another 16 × (1 − 0.92/1.92) × 100 = 833.33.
  const bars = panel.getByRole("textbox", {
    name: "Steel Bar 4.0, sell order in Lymhurst",
  });
  await bars.fill("200");
  await bars.press("Enter");

  await expect(
    panel
      .getByRole("region", { name: "Result" })
      .getByRole("definition")
      .first(),
  ).toHaveText("3,519");
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(profit).toHaveText("3,519");
  await expect(page).not.toHaveURL(/item=/);
});
