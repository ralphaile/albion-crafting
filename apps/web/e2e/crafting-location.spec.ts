import { expect, test } from "./test";

test("a Forest Q6 level 9 hideout shows its return rates, and is there next visit", async ({
  page,
}) => {
  await page.goto("./?place=0000");
  const bar = page.getByRole("region", {
    name: "Where you craft, buy and sell",
  });
  const field = (name: string) => bar.getByRole("combobox", { name });

  await field("Crafting location").selectOption("Hideout");
  await field("Biome").selectOption("Forest");
  await field("Map quality").selectOption("Q6");
  await field("Power level").selectOption("9");

  // A Forest Q6 level 9 hideout has a 0.26 general bonus, its specialties add
  // 0.26 for map quality and 0.30 specialist, and focus adds 0.59:
  //   return rate   0.26 / 1.26 = 20.63%, specialty 0.82 / 1.82 = 45.05%
  //   with focus    0.85 / 1.85 = 45.95%, specialty 1.41 / 2.41 = 58.51%
  const returnRates = bar.getByRole("definition");
  await expect(returnRates).toHaveText([
    "20.63%",
    "45.05%",
    "45.95%",
    "58.51%",
  ]);
  await expect(page).toHaveURL(
    /\?place=hideout&biome=FOREST&quality=6&level=9&buy=Lymhurst&sell=Lymhurst$/,
  );

  await page.goto("./");

  await expect(field("Crafting location")).toHaveValue("hideout");
  await expect(field("Biome")).toHaveValue("FOREST");
  await expect(returnRates).toHaveText([
    "20.63%",
    "45.05%",
    "45.95%",
    "58.51%",
  ]);
});
