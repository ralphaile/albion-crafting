import { answerPrices, expect, test } from "./test";

test("Refining ranks metal bars with Thetford's ore bonus, and stays on next visit", async ({
  page,
}) => {
  await answerPrices(page, [
    { itemId: "T5_ORE", marketId: "Thetford", sellMin: 100 },
    { itemId: "T4_METALBAR", marketId: "Thetford", sellMin: 200 },
    { itemId: "T5_METALBAR", marketId: "Thetford", sellMin: 1000 },
  ]);

  await page.goto("./?place=0000&buy=Thetford&sell=Thetford&tier=5&enchant=0");
  await page
    .getByRole("radiogroup", { name: "Mode" })
    .getByText("Refining")
    .click();
  await page.getByRole("button", { name: /^Category/ }).click();
  await page
    .getByRole("group", { name: "Refined" })
    .getByText("Metal bar")
    .click();
  await page.keyboard.press("Escape");

  await expect(page).toHaveURL(/mode=refining&tier=5&enchant=0&cat=metalbars$/);
  const rows = page
    .getByRole("region", { name: "Best crafts" })
    .getByRole("rowheader");
  await expect(rows).toHaveText(["Titanium Steel Bar5.0Specialty"]);

  await rows.getByText("Titanium Steel Bar").click();
  const panel = page.getByRole("dialog", { name: "Titanium Steel Bar 5.0" });
  const returnRate = panel.getByRole("region", { name: "Return rate" });
  await expect(returnRate.getByRole("definition").last()).toHaveText("53.92%");

  await page.goto("./");

  await expect(page.getByRole("radio", { name: "Refining" })).toBeChecked();
  await expect(
    page.getByRole("list", { name: "Active filters" }).getByRole("button"),
  ).toHaveText(["Tier 5", "Enchant .0", "Metal bar"]);
});
