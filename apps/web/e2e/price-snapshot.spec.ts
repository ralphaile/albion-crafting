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
  // The bars are bought in Thetford and the leather in Martlock, the cities
  // that refine them with a bonus.
  const rows: Record<string, unknown[][]> = {
    thetford: [["T4_METALBAR", 100, seen, 0, NO_DATA_DATE]],
    martlock: [["T4_LEATHER", 50, seen, 0, NO_DATA_DATE]],
    lymhurst: [["T4_MAIN_SWORD", 5000, seen, 0, NO_DATA_DATE]],
  };
  await page.route(/\/albion-crafting\/prices\//, (route) => {
    const path = new URL(route.request().url()).pathname;
    snapshots.push(path);
    const market = /\/west\/([a-z]+)\.json$/.exec(path)?.[1] ?? "";
    const snapshot = rows[market];
    return snapshot === undefined
      ? route.fulfill({ status: 404, body: "" })
      : route.fulfill({ json: { fetchedAt: Date.now(), rows: snapshot } });
  });

  await page.goto("./?tier=4&enchant=0&q=broadsword");

  // The same broadsword as in best-crafts.spec.ts, from the same prices.
  const row = page
    .getByRole("region", { name: "Best crafts" })
    .getByRole("row")
    .filter({ hasText: "Adept's Broadsword" });
  await expect(row.getByRole("cell").first()).toHaveText("3,417");
  await expect(row).toContainText("3 h");
  expect(snapshots.toSorted()).toEqual(
    ["lymhurst", "martlock", "thetford"].map(
      (market) => `/albion-crafting/prices/west/${market}.json`,
    ),
  );
  // The browser logs each AODP request that failed.
  expect(new Set(problems)).toEqual(
    new Set([
      "Failed to load resource: the server responded with a status of 404 (Not Found)",
    ]),
  );
  problems.splice(0);
});
