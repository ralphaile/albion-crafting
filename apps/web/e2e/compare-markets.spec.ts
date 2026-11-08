import { answerPrices, expect, test } from "./test";

test("Compare markets lists the broadsword in every sell market, best first, and sells in the one you pick", async ({
  page,
}) => {
  await answerPrices(page, [
    { itemId: "T4_METALBAR", marketId: "Thetford", sellMin: 100 },
    { itemId: "T4_LEATHER", marketId: "Martlock", sellMin: 50 },
    { itemId: "T4_MAIN_SWORD", marketId: "Lymhurst", sellMin: 5000 },
    { itemId: "T4_MAIN_SWORD", marketId: "Caerleon", sellMin: 6200 },
    { itemId: "T4_MAIN_SWORD", marketId: "Black Market", buyMax: 5600 },
  ]);
  await page.goto("./?tier=4&enchant=0&q=broadsword");
  const row = page
    .getByRole("region", { name: "Best crafts" })
    .getByRole("row")
    .filter({ hasText: "Adept's Broadsword" });
  await row.getByText("Adept's Broadsword").click();
  const panel = page.getByRole("dialog", { name: "Adept's Broadsword 4.0" });

  await panel.getByRole("tab", { name: "Compare markets" }).click();

  // Each net is the price less 4% premium tax, and a sell order's 2.5% setup
  // fee. The Black Market only buys, so it has no setup fee. The materials
  // cost 1,042 and the station fee 216, so the profit is the net less 1,258.
  const markets = panel.getByRole("table");
  const rowFor = (market: string) =>
    markets.getByRole("row").filter({
      has: page.getByRole("rowheader", { name: new RegExp(`^${market}`) }),
    });
  await expect(markets.getByRole("rowheader")).toHaveText([
    /^Caerleon\s*Best/,
    /^Black Market/,
    /^Lymhurst/,
    ...Array.from({ length: 8 }, () => /no price/),
  ]);
  await expect(rowFor("Caerleon").getByRole("cell")).toHaveText([
    "5,797",
    "4,539+1,122 vs Lymhurst",
    "Sell here",
  ]);
  await expect(rowFor("Black Market").getByRole("cell")).toHaveText([
    "5,376",
    "4,118",
    "Sell here",
  ]);
  await expect(
    panel.getByRole("button", { name: "Sell in Lymhurst" }),
  ).toHaveAttribute("aria-pressed", "true");

  await panel.getByRole("button", { name: "Sell in Caerleon" }).click();

  await expect(
    panel.getByRole("button", { name: "Sell in Caerleon" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("combobox", { name: "Sell in" })).toHaveValue(
    "Caerleon",
  );
  await expect(row.getByRole("cell").first()).toHaveText("4,539");
});
