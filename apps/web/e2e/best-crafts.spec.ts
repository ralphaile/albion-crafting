import { answerPrices, expect, test } from "./test";

test("ranks the one craft with every price first, with its numbers worked out", async ({
  page,
}) => {
  await answerPrices(page, [
    { itemId: "T4_METALBAR", marketId: "Lymhurst", sellMin: 100 },
    { itemId: "T4_LEATHER", marketId: "Lymhurst", sellMin: 50 },
    { itemId: "T4_MAIN_SWORD", marketId: "Lymhurst", sellMin: 5000 },
  ]);
  await page.goto("./");

  // Adept's Broadsword in Lymhurst with focus, 16 bars and 8 leather, item value 384:
  //   return rate   (0.18 city + 0.15 sword + 0.59 focus) / 1.92 = 47.9%
  //   materials     2,000 × (1 − 0.92/1.92) = 1,041.67
  //   station fee   384 × 0.1125 × 500 / 100 = 216
  //   revenue       5,000 − 4% tax − 2.5% setup fee = 4,675
  //   profit        4,675 − 1,041.67 − 216 = 3,417.33, a 271.7% margin
  //   without focus materials are 2,000 × (1 − 0.33/1.33) = 1,503.76,
  //   so focus saves 462.09 silver for 1,286 focus: 0.36 silver per focus
  const rows = page
    .getByRole("region", { name: "Best crafts" })
    .getByRole("row");
  const topRow = rows.nth(1);
  await expect(topRow.getByRole("rowheader")).toHaveText(
    /^Adept's Broadsword\s*4\.0\s*Specialty$/,
  );
  await expect(topRow.getByRole("cell")).toHaveText([
    "3,417",
    "271.7%",
    "0.4",
    "1,042",
    "4,675",
    "47.9%",
    /item 30 min.*materials 30 min/,
  ]);
  await expect(rows.nth(2)).toHaveText(/^Missing prices · [\d,]+ crafts$/);
});
