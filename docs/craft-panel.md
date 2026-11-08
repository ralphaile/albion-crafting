# Craft panel

A click anywhere on a row opens that craft in a panel over the right of the page, and so do the row's pencil and its **N prices missing**. The panel shows how the table got its numbers, and every price in it can be typed over ([manual prices](manual-prices.md)). The table and the panel change as soon as a price is saved. In the code, it's `apps/web/src/CraftPanel.tsx`.

It has two tabs: **Breakdown**, which it opens on, and **Compare markets**. The arrow keys move between them.

## What it shows

- **Recipe:** only for an item with more than one, such as an artifact or the token used instead. Each recipe shows the icon and name of what tells it apart, its profit or how many prices it's missing, and ✓ on the one the table uses.
  - **Most profitable**, until you choose: the most profitable recipe with all its prices, or the first in the game files while none has them all.
  - **Choosing a recipe** makes the table use it for that item, even when another earns more or it's missing a price. The row says **Your recipe**. **Most profitable** goes back.
  - **Saved in the browser** for that exact item, tier and enchantment, as the `recipeChoices` setting.
- **Materials:** each material with how many a craft takes, its price and where it came from. Under it, how many you buy once the returns are counted, times the unit price, gives the line's cost: `8.33 × 100 = 833`. A material that never comes back, such as an artifact, says **Not returned**. Buying with a buy order adds the 2.5% setup fee to the unit price.
- **Return rate:** what each part adds to the production bonus, and the return rate it gives ([glossary](glossary.md#return-rate-rrr)). A city has its base bonus and specialty, and a hideout has its map quality, power level and power specialist. Both can have the daily bonus and focus.
- **Costs:** materials, station fee and silver for one craft. A recipe that makes several items also shows the cost of each.
- **Revenue:** the item's price where you sell, less tax and the setup fee.
- **Focus:** only while focus is on, and only for a recipe that costs focus. A royal item costs none, so it has no focus section. Otherwise: mastery, the item's own specialization and the tree's other specializations, each times its [FCE](glossary.md#fce) amount, then the total FCE, the base focus and the focus the craft costs. When that FCE is 0, **Fill in specializations** opens the [specializations](specializations.md) panel on this craft's tree.
- **Result:** profit and margin, and silver per focus when the recipe costs focus.

A figure a missing price keeps from being worked out shows **—**.

## Compare markets

The item's price, net revenue and profit in every market you can sell in: the cities, the [Black Market](glossary.md#black-market) and the Black Zone's Rests. The materials and costs are the route's, so only the revenue changes from one market to the next.

- **Order:** the highest net first, then the markets without a price.
- **Best:** the first market is highlighted, with how much more an item nets there than in the current sell market, such as `+1,122 vs Lymhurst`.
- **Prices** are picked as the table picks them: a [price you typed](manual-prices.md) for that market, the [badge](glossary.md#fresh-stale-and-missing-prices) for its freshness, and [outliers](glossary.md#outliers) judged against that market's own 7-day average. The Black Market is sold to its buy orders, whatever the sell mode.
- **Sell here** makes that market the route's sell market. The table works the crafts out again, and the panel stays open.
- **Fetched** when the tab opens, in one request for every market, then kept with the other prices.

## In the link

While the panel is open, the link carries the item, such as `item=T4_MAIN_SWORD`, so a shared link opens it too. The panel still finds a craft that a minimum profit or margin hides, so typing a price that drops it below the minimum doesn't close the panel. A link to an item the route or filters don't include opens nothing, and the item is taken out of the link.
