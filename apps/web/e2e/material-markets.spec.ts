import { answerPrices, expect, test } from "./test";

test("a craft's bars come from Thetford and its leather from Martlock, until the leather is pinned to Caerleon", async ({
  page,
}) => {
  await answerPrices(page, [
    { itemId: "T4_METALBAR", marketId: "Thetford", sellMin: 100 },
    { itemId: "T4_LEATHER", marketId: "Martlock", sellMin: 50 },
    { itemId: "T4_LEATHER", marketId: "Caerleon", sellMin: 30 },
    { itemId: "T4_MAIN_SWORD", marketId: "Lymhurst", sellMin: 5000 },
  ]);
  await page.goto("./?tier=4&enchant=0&q=broadsword");
  await expect(
    page.getByRole("button", { name: "Buy materials in" }),
  ).toHaveText("Lymhurst +3");
  const row = page
    .getByRole("region", { name: "Best crafts" })
    .getByRole("row")
    .filter({ hasText: "Adept's Broadsword" });
  const profit = row.getByRole("cell").first();

  // The same broadsword as in best-crafts.spec.ts, from the same prices.
  await expect(profit).toHaveText("3,417");
  await row.getByText("Adept's Broadsword").click();
  const panel = page.getByRole("dialog", { name: "Adept's Broadsword 4.0" });
  await expect(
    panel.getByRole("textbox", {
      name: "Steel Bar 4.0, sell order in Thetford",
    }),
  ).toHaveAttribute("placeholder", "100");
  await expect(
    panel.getByRole("textbox", {
      name: "Worked Leather 4.0, sell order in Martlock",
    }),
  ).toHaveAttribute("placeholder", "50");

  await panel
    .getByRole("button", { name: "Market for Worked Leather 4.0: Martlock" })
    .click();
  await panel.getByRole("button", { name: "Caerleon" }).click();

  // Leather at 30 instead of 50 makes the materials 1,840 × (1 − 0.92/1.92)
  // = 958.33, so the profit is 4,675 − 958.33 − 216 = 3,500.67.
  await expect(
    panel.getByRole("textbox", {
      name: "Worked Leather 4.0, sell order in Caerleon",
    }),
  ).toHaveAttribute("placeholder", "30");
  await expect(profit).toHaveText("3,501");

  await page.reload();

  await expect(profit).toHaveText("3,501");
});
