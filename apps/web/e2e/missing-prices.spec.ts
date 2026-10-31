import { answerPrices, expect, test } from "./test";

test("fills a Black Zone route's missing prices in one pass, and the crafts get ranked", async ({
  page,
}) => {
  await answerPrices(page, [
    { itemId: "T4_METALBAR", marketId: "Lymhurst", sellMin: 100 },
    { itemId: "T4_LEATHER", marketId: "Lymhurst", sellMin: 50 },
  ]);
  await page.goto(
    "./?place=hideout&biome=FOREST&quality=6&level=9&buy=Lymhurst&sell=Arthurs+Rest+Smugglers+Network&tier=4&enchant=0&artifacts=exclude&cat=sword",
  );
  const rows = page
    .getByRole("region", { name: "Best crafts" })
    .getByRole("row");
  await expect(rows.nth(1)).toHaveText("Missing prices · 3 crafts");

  await page.getByRole("button", { name: "3 prices missing" }).click();
  const panel = page.getByRole("dialog", { name: "Missing prices" });
  await expect(panel.getByRole("textbox")).toHaveCount(3);
  await panel
    .getByRole("textbox", {
      name: "Adept's Claymore 4.0, sell order in Arthur's Rest",
    })
    .fill("9000");
  await page.keyboard.press("Enter");
  await page.keyboard.type("7000");
  await page.keyboard.press("Enter");
  await page.keyboard.type("6000");
  await page.keyboard.press("Enter");

  await expect(panel.getByText("No prices missing")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();

  // Adept's Broadsword in a Q6 level 9 forest hideout with focus:
  //   materials     16 bars and 8 leather, 2,000 × (1 − 58.51%) = 829.8
  //   station fee   384 × 0.1125 × 500 / 100 = 216
  //   revenue       6,000 − 4% tax − 2.5% setup fee = 5,610
  //   profit        5,610 − 829.8 − 216 = 4,564.2
  await expect(rows).toHaveCount(4);
  await expect(
    rows.filter({ hasText: "Adept's Broadsword" }).getByRole("cell").first(),
  ).toHaveText("4,564");
  for (const sword of ["Adept's Claymore", "Adept's Dual Swords"]) {
    await expect(
      rows.filter({ hasText: sword }).getByRole("cell").first(),
    ).toHaveText(/^[\d,]+$/);
  }
  await expect(page.getByRole("button", { name: /missing$/ })).toHaveCount(0);
});
