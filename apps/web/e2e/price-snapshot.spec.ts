import { expect, test } from "./test";

const NO_DATA_DATE = "0001-01-01T00:00:00";

function seenAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString().slice(0, 19);
}

test("AODP down on a first visit: the crafts are priced from the site's snapshot", async ({
  page,
  problems,
}) => {
  await page.route(
    /^https:\/\/[a-z]+\.albion-online-data\.com\/api\/v2\/stats\/prices\//,
    (route) => route.fulfill({ status: 404, body: "" }),
  );
  const seen = seenAgo(3 * 60);
  const snapshots: string[] = [];
  await page.route(/\/albion-crafting\/prices\//, (route) => {
    const path = new URL(route.request().url()).pathname;
    snapshots.push(path);
    return path.endsWith("/west/lymhurst.json")
      ? route.fulfill({
          json: {
            fetchedAt: Date.now(),
            rows: [
              ["T4_METALBAR", 100, seen, 0, NO_DATA_DATE],
              ["T4_LEATHER", 50, seen, 0, NO_DATA_DATE],
              ["T4_MAIN_SWORD", 5000, seen, 0, NO_DATA_DATE],
            ],
          },
        })
      : route.fulfill({ status: 404, body: "" });
  });

  await page.goto("./?tier=4&enchant=0&q=broadsword");

  // The same broadsword as in best-crafts.spec.ts, from the same prices.
  const row = page
    .getByRole("region", { name: "Best crafts" })
    .getByRole("row")
    .filter({ hasText: "Adept's Broadsword" });
  await expect(row.getByRole("cell").first()).toHaveText("3,417");
  await expect(row).toContainText("3 h");
  expect(snapshots).toEqual(["/albion-crafting/prices/west/lymhurst.json"]);
  // The browser logs each AODP request that failed.
  expect(new Set(problems)).toEqual(
    new Set([
      "Failed to load resource: the server responded with a status of 404 (Not Found)",
    ]),
  );
  problems.splice(0);
});
