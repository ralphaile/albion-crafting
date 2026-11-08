# Crafting plan

A plan says what you'll craft where, and how many: "10 broadswords in Lymhurst, 5 in a Forest hideout". It has its own page, **Plan** at the top of the app (`#plan`).

## The page

`apps/web/src/PlanPage.tsx`:

- **Add location** adds a location with the route chosen on the best-crafts page, titled by its place, such as "Lymhurst" or "Forest hideout, Q6, level 9". Each location has its own route bar to change where it crafts, buys and sells, and × to remove it.
- **Add an item** searches items by name. Each item found has a button per enchantment, 4.0 to 4.4, which adds one of it, with focus.
- **Each row** has the item's icon and name, its enchantment, and its recipe when it has more than one, named by the materials that differ, such as the artifact. Then the quantity with − and +, a focus switch and the daily bonus: none, 10% or 20%. It shows the materials to buy, in whole items, the focus, the station fee, the sell price and the profit. The materials and the sell price carry the same price badges as the best-crafts table: fresh, stale, typed or missing. The sell price is a field showing the price in use; typing over it saves a [typed price](manual-prices.md). An entry without every price says **Prices missing** instead of a profit.
- **Totals:** the plan's, and each location's in its heading: silver to invest, focus and profit. Silver to invest is the materials in whole items, the station fees and the recipes' silver.
- **Missing prices:** while the plan page is open, the **prices missing** button at the top lists only the plan's missing prices, to type them.
- **On a narrow screen** each row is a card, its fields labelled.
- **Shopping list:** every material the plan needs, added up across entries and locations for each market it's bought in. Each line is the expected count after returns rounded up to whole items, its unit price and its cost, with a total per market. The unit price is a field like the sell price: typing over it saves a typed price for that material in that market. **Copy as text** copies it, for example to paste into Discord. `shoppingList()` in `apps/web/src/shopping-list.helpers.ts` builds it.

`usePlan()` asks each market once for every item the plan needs there, so editing a quantity or focus needs no new request. Prices use the same settings as the best-crafts table: the server, when a price goes stale, and the typed prices.

## Adding from the ranking

Each row of the best-crafts table has a **+** button, and the craft panel an **Add to plan** button. Both ask for the quantity, then add the craft to the plan:

- **Where:** the location with the route chosen above the table, made if the plan doesn't have it yet.
- **Which recipe:** the one the table uses, chosen in the panel or the most profitable.
- **Focus and daily bonus:** as in Settings, the daily bonus being the one for the item's own category.
- **Already there:** the same item and recipe at that location, with the same focus and daily bonus, gets the quantity added, up to 100,000. With other focus or daily bonus it's a row of its own.

## Filling it from a focus budget

**Fill from focus** on the plan page fills the plan with the best crafts for the focus you have. It spends **Focus you have** (10,000 to start, at most the 30,000 a character stores), and asks for the most of each item (100 to start) and, optionally, the silver to spend.

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
- **Each entry:** the crafts, the items made, the materials you expect to buy after [returns](glossary.md#return-rate-rrr), rounded up to whole items and priced that way, the focus, and with every price, the cost (materials, station fees and silver), the revenue and the profit.
- **Totals**, per location and for the plan: focus, cost, revenue and profit, and the items with a missing price, once each. An entry with a missing price still counts its focus, but not its silver, and marks the totals incomplete.
