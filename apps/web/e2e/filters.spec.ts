import { answerPrices, expect, test } from "./test";

const AODP_PRICES = /\/api\/v2\/stats\/prices\/([^/?]+)\.json/;

test("a filtered link prices only its items, and the filters are kept", async ({
  page,
}) => {
  await answerPrices(page, [
    { itemId: "T4_METALBAR", marketId: "Lymhurst", sellMin: 100 },
    { itemId: "T4_LEATHER", marketId: "Lymhurst", sellMin: 50 },
    { itemId: "T4_MAIN_SWORD", marketId: "Lymhurst", sellMin: 5000 },
  ]);
  const requested = new Set<string>();
  page.on("request", (request) => {
    const [, path] = AODP_PRICES.exec(request.url()) ?? [];
    for (const itemId of path?.split(",") ?? []) {
      requested.add(decodeURIComponent(itemId));
    }
  });

  await page.goto("./?tier=4&enchant=0&cat=sword&artifacts=exclude&complete=1");

  const chips = page.getByRole("list", { name: "Active filters" });
  await expect(chips.getByRole("button")).toHaveText([
    "Tier 4",
    "Enchant .0",
    "Sword",
    "No artifacts",
    "No missing prices",
  ]);
  await expect(page.getByText(/ranked by/)).toHaveText(
    /^1 craft ranked by silver per focus$/,
  );
  await expect(page.getByRole("row").nth(1).getByRole("rowheader")).toHaveText(
    /^Adept's Broadsword/,
  );
  // The three T4.0 swords without artifacts and their materials, not the whole catalog.
  expect([...requested].sort()).toEqual([
    "T4_2H_CLAYMORE",
    "T4_2H_DUALSWORD",
    "T4_LEATHER",
    "T4_MAIN_SWORD",
    "T4_METALBAR",
  ]);

  await page.getByRole("button", { name: "Remove filter: Tier 4" }).click();

  await expect(chips.getByRole("button")).toHaveText([
    "Enchant .0",
    "Sword",
    "No artifacts",
    "No missing prices",
  ]);
  await expect(page).toHaveURL(
    /\?enchant=0&cat=sword&artifacts=exclude&complete=1$/,
  );
  await expect(page.getByRole("button", { name: "T4" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );

  await page.goto("./");

  await expect(chips.getByRole("button")).toHaveText([
    "Enchant .0",
    "Sword",
    "No artifacts",
    "No missing prices",
  ]);
  await expect(page).toHaveURL(
    /\?enchant=0&cat=sword&artifacts=exclude&complete=1$/,
  );

  await page.getByRole("button", { name: "Clear all", exact: true }).click();

  await expect(chips).toBeHidden();
  await expect(page).toHaveURL(/\/albion-crafting\/$/);
});
