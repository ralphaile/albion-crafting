import { expect, test } from "./test";

test("the app loads and shows its title", async ({ page }) => {
  await page.goto("./");

  await expect(page).toHaveTitle("Albion Crafting");
  await expect(
    page.getByRole("heading", { name: "Albion Crafting" }),
  ).toBeVisible();
});
