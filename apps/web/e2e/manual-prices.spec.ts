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

test("a newer AODP price replaces a typed one, unless you always prefer yours", async ({
  page,
}) => {
  const now = Date.now();
  const materials = [
    {
      itemId: "T4_METALBAR",
      marketId: "Lymhurst",
      sellMin: 100,
      ageMinutes: 3 * 60,
    },
    {
      itemId: "T4_LEATHER",
      marketId: "Lymhurst",
      sellMin: 50,
      ageMinutes: 3 * 60,
    },
  ];
  await page.clock.install({ time: now - 125 * 60_000 });
  await answerPrices(page, materials);
  await page.goto("./?tier=4&enchant=0&q=broadsword");
  const row = page
    .getByRole("region", { name: "Best crafts" })
    .getByRole("row")
    .filter({ hasText: "Adept's Broadsword" });

  await row.getByRole("button", { name: "1 price missing" }).click();
  const sword = page
    .getByRole("dialog", { name: "Adept's Broadsword 4.0" })
    .getByRole("textbox", {
      name: "Adept's Broadsword 4.0, sell order in Lymhurst",
    });
  await sword.fill("6000");
  await sword.press("Enter");
  await expect(sword).toHaveAccessibleDescription(
    "Sell order · Lymhurst · typed just now",
  );
  await page.keyboard.press("Escape");

  // Two hours later, AODP has a sword price seen 30 minutes ago.
  await answerPrices(page, [
    ...materials,
    {
      itemId: "T4_MAIN_SWORD",
      marketId: "Lymhurst",
      sellMin: 5000,
      ageMinutes: 30,
    },
  ]);
  // The real time, not `now`: AODP's ages count from when it answers.
  await page.clock.setSystemTime(Date.now());
  await page.reload();

  // Adept's Broadsword in Lymhurst with focus: 1,041.67 materials and 216
  // station fee, so selling at 5,000 (4,675 after tax and setup fee) makes
  // 3,417 and selling at 6,000 (5,610) makes 4,352.
  const profit = row.getByRole("cell").first();
  await expect(profit).toHaveText("3,417");
  await expect(
    row.getByRole("button", { name: /^item 30 min/ }),
  ).toHaveAccessibleDescription(
    "API fresh 5,000, seen 30 min ago Not used: Manual 6,000, typed 2 h ago",
  );

  await page.getByRole("button", { name: "Settings" }).click();
  await page
    .getByRole("dialog", { name: "Settings" })
    .getByRole("checkbox", { name: "Always prefer my manual prices" })
    .check();
  await page.keyboard.press("Escape");

  await expect(profit).toHaveText("4,352");
  await expect(
    row.getByRole("button", { name: /^item 2 h/ }),
  ).toHaveAccessibleDescription(
    "Manual 6,000, typed 2 h ago Not used: API fresh 5,000, seen 30 min ago",
  );
});
