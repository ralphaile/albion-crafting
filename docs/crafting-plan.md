# Crafting plan

A plan says what you'll craft where, and how many: "10 broadswords in Lymhurst, 5 in a Forest hideout". It has its own page, **Plan** at the top of the app (`#plan`).

## The page

`apps/web/src/PlanPage.tsx`:

- **Add location** adds a location with the route chosen on the best-crafts page. Each location has its own route bar to change where it crafts, buys and sells, and a button to remove it.
- **Add an item** searches items by name and adds one at quantity 1, with focus. Each entry's enchantment, recipe, quantity, focus and daily bonus can be changed in its row.
- **Each row** shows the materials to buy after returns, the focus, the station fee and the profit. The materials and the profit carry the same price badges as the best-crafts table: fresh, stale, typed or missing. An entry without every price says which ones it's missing instead of a profit.
- **Totals** for each location and for the plan: silver to invest, focus and profit, and the missing prices.
- **Days of focus:** the plan's totals compare its focus with **Focus you have** (10,000 to start, at most the 30,000 a character stores) and say how many days of the 10,000 focus regained a day it takes, or "Enough now". `focusDays()` in `packages/core/src/focus.helpers.ts` counts them. The focus uses each item's focus cost efficiency from your specializations.
- **Shopping list:** every material the plan needs, added up across entries and locations for each market it's bought in. Each line is the expected count after returns rounded up to whole items, its unit price and its cost, with a total per market. **Copy as text** copies it, for example to paste into Discord. `shoppingList()` in `apps/web/src/shopping-list.helpers.ts` builds it.

`usePlan()` asks each market once for every item the plan needs there, so editing a quantity or focus needs no new request. Prices use the same settings as the best-crafts table: the server, when a price goes stale, and the typed prices.

## Adding from the ranking

Each row of the best-crafts table has a **+** button, and the craft panel an **Add to plan** button. Both ask how many, then add the craft to the plan:

- **Where:** the location with the route chosen above the table, made if the plan doesn't have it yet.
- **Which recipe:** the one the row ranks, or the one shown in the panel.
- **Focus and daily bonus:** as in Settings, the daily bonus being the one for the item's own category.
- **Already there:** the same item and recipe at that location, with the same focus and daily bonus, gets the quantity added, up to 100,000. With other focus or daily bonus it's a row of its own.

## Filling it from a focus budget

**Fill from focus** on the plan page fills the plan with the best crafts for the focus you have. It spends **Focus you have**, and asks for the most of each item (100 to start) and, optionally, the silver to spend.

- **Which crafts:** the ones the best-crafts table ranks for its route and filters, with every price. It needs **Focus** on in Settings, as only then do crafts have a focus cost.
- **Greedy by silver per focus:** `fillFocusBudget()` in `packages/core/src/focus-budget.helpers.ts` takes the craft with the most silver per focus first, as many crafts as the focus, the silver and the item's cap allow, then the next. Crafts that lose silver are left out.
- **Cap per item:** the most of each item, or what sells in a day in the sell market when that's known and lower, in whole crafts.
- **Where:** like **Add to plan**, at the location with the table's route, with focus on and the item's daily bonus from Settings. Filling again adds to the quantities.

## The model

`apps/web/src/plan.types.ts`:

- **`CraftingPlan`:** a list of locations.
- **A location:** a route, the same as the one above the table: the crafting place (a city, Rest, island, or a hideout with its biome, map quality and power level), and the markets it buys materials in and sells items in. A location selling at the Black Market sells to its buy orders.
- **An entry:** an item with its enchantment, as a market ID such as `T5_MAIN_SWORD@1`, which recipe (`alternative` 0 is the usual one, 1 on its alternatives), the quantity, whether to use focus, and its daily bonus: 0, 0.1 or 0.2 for the item's own crafting category.

## Saved in the browser

The plan is saved in IndexedDB with the other settings, as `PLAN_SETTING` in `apps/web/src/saved-settings.constants.ts`. It isn't in the link. `parsePlan()` keeps what fits, one entry at a time: an entry for an item the app no longer has, or with no quantity, is left out, an alternative the recipe doesn't have becomes its usual recipe, and a route that doesn't fit becomes the default one.

## Evaluating it

`evaluatePlan()` in `packages/core/src/plan.helpers.ts` evaluates each entry at its own location, with that location's prices, and adds up each location and the whole plan. `planLocations()` in `apps/web/src/plan.helpers.ts` turns a saved plan into its input.

- **Whole crafts:** the quantity is how many items you want. They're made in whole crafts, so a recipe that makes 4 at once makes 8 for a quantity of 5, and all 8 are sold.
- **Each entry:** the crafts, the items made, the materials you expect to buy after [returns](glossary.md#return-rate-rrr), the focus, and with every price, the cost (materials, station fees and silver), the revenue and the profit.
- **Totals**, per location and for the plan: focus, cost, revenue and profit, and the items with a missing price, once each. An entry with a missing price still counts its focus, but not its silver, and marks the totals incomplete.
