import type { Locator } from "@playwright/test";

import { answerPrices, expect, test } from "./test";

const BROADSWORD = "Adept's Broadsword 4.0";

async function addBroadsword(location: Locator, quantity: string) {
  await location.getByLabel("Add an item").fill("broadsword");
  await location.getByRole("button", { name: `Add ${BROADSWORD}` }).click();
  await location.getByLabel(`Quantity of ${BROADSWORD}`).fill(quantity);
}

test("a plan with broadswords in Lymhurst and a Forest hideout shows each place's results and the totals, and is there next visit", async ({
  page,
}) => {
  await answerPrices(page, [
    { itemId: "T4_METALBAR", marketId: "Lymhurst", sellMin: 100 },
    { itemId: "T4_LEATHER", marketId: "Lymhurst", sellMin: 50 },
    { itemId: "T4_MAIN_SWORD", marketId: "Lymhurst", sellMin: 5000 },
  ]);

  await page.goto("./?place=1000&buy=Lymhurst&sell=Lymhurst");
  await page
    .getByRole("navigation", { name: "Pages" })
    .getByRole("link", { name: "Plan" })
    .click();

  await page.getByRole("button", { name: "Add location" }).click();
  const city = page.getByRole("region", { name: "Location 1" });
  await addBroadsword(city, "10");

  await page.getByRole("button", { name: "Add location" }).click();
  const hideout = page.getByRole("region", { name: "Location 2" });
  const field = (name: string) => hideout.getByRole("combobox", { name });
  await field("Crafting location").selectOption("Hideout");
  await field("Biome").selectOption("Forest");
  await field("Map quality").selectOption("Q6");
  await field("Power level").selectOption("9");
  await addBroadsword(hideout, "5");
  await hideout.getByLabel(`Use focus for ${BROADSWORD}`).uncheck();

  const focus = (totals: Locator) => totals.getByRole("definition").nth(1);
  await expect(focus(city.getByLabel("Location 1 totals"))).toHaveText(
    "12,860",
  );
  await expect(focus(hideout.getByLabel("Location 2 totals"))).toHaveText("0");
  await expect(focus(page.getByLabel("Plan totals"))).toHaveText("12,860");
  await expect(
    hideout.getByRole("list", { name: `Materials for ${BROADSWORD}` }),
  ).toContainText("Steel Bar 4.0");

  await page.reload();

  await expect(city.getByLabel(`Quantity of ${BROADSWORD}`)).toHaveValue("10");
  await expect(field("Crafting location")).toHaveValue("hideout");
  await expect(hideout.getByLabel(`Quantity of ${BROADSWORD}`)).toHaveValue(
    "5",
  );
});
