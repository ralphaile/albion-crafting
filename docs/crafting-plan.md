# Crafting plan

A plan says what you'll craft where, and how many: "10 broadswords in Lymhurst, 5 in a Forest hideout". This is the model and the maths. The screen to build one comes later.

## The model

`apps/web/src/plan.types.ts`:

- **`CraftingPlan`:** a list of locations.
- **A location:** a route, the same as the one above the table: the crafting place (a city, Rest, island, or a hideout with its biome, map quality and power level), and the markets it buys materials in and sells items in.
- **An entry:** an item with its enchantment, as a market ID such as `T5_MAIN_SWORD@1`, which recipe (`alternative` 0 is the usual one, 1 on its alternatives), the quantity, whether to use focus, and its daily bonus: 0, 0.1 or 0.2 for the item's own crafting category.

## Saved in the browser

The plan is saved in IndexedDB with the other settings, as `PLAN_SETTING` in `apps/web/src/saved-settings.constants.ts`. It isn't in the link. `parsePlan()` keeps what fits, one entry at a time: an entry for an item the app no longer has, or with no quantity, is left out, an alternative the recipe doesn't have becomes its usual recipe, and a route that doesn't fit becomes the default one.

## Evaluating it

`evaluatePlan()` in `packages/core/src/plan.helpers.ts` evaluates each entry at its own location, with that location's prices, and adds up each location and the whole plan. `planLocations()` in `apps/web/src/plan.helpers.ts` turns a saved plan into its input.

- **Whole crafts:** the quantity is how many items you want. They're made in whole crafts, so a recipe that makes 4 at once makes 8 for a quantity of 5, and all 8 are sold.
- **Each entry:** the crafts, the items made, the materials you expect to buy after [returns](glossary.md#return-rate-rrr), the focus, and with every price, the cost (materials, station fees and silver), the revenue and the profit.
- **Totals**, per location and for the plan: focus, cost, revenue and profit, and the items with a missing price, once each. An entry with a missing price still counts its focus, but not its silver, and marks the totals incomplete.
