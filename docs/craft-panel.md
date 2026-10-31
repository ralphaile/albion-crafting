# Craft panel

A click anywhere on a row opens that craft in a panel over the right of the page, and so do the row's pencil and its **N prices missing**. The panel shows how the table got its numbers, and every price in it can be typed over ([manual prices](manual-prices.md)). The table and the panel change as soon as a price is saved. In the code, it's `apps/web/src/CraftPanel.tsx`.

## What it shows

- **Recipe:** only for an item with more than one, such as an artifact or the token used instead. Each recipe shows its profit, or how many prices it's missing, and ✓ marks the one the table uses: the most profitable with all its prices, or the first in the game files while none has them all. Picking another shows its numbers and its prices to type, without changing the table.
- **Materials:** each material with how many a craft takes, its price and where it came from. Under it, how many you buy once the returns are counted, times the unit price, gives the line's cost: `8.33 × 100 = 833`. A material that never comes back, such as an artifact, says **Not returned**. Buying with a buy order adds the 2.5% setup fee to the unit price.
- **Return rate:** what each part adds to the production bonus, and the return rate it gives ([glossary](glossary.md#return-rate-rrr)). A city has its base bonus and specialty, and a hideout has its map quality, power level and power specialist. Both can have the daily bonus and focus.
- **Costs:** materials, station fee and silver for one craft. A recipe that makes several items also shows the cost of each.
- **Revenue:** the item's price where you sell, less tax and the setup fee.
- **Focus:** only while focus is on. Mastery, the item's own specialization and the tree's other specializations, each times its [FCE](glossary.md#fce) amount, then the total FCE, the base focus and the focus the craft costs. When that FCE is 0, **Fill in specializations** opens the [specializations](specializations.md) panel on this craft's tree.
- **Result:** profit and margin, and with focus, the silver each focus point adds.

A figure a missing price keeps from being worked out shows **—**.

## In the link

While the panel is open, the link carries the item, such as `item=T4_MAIN_SWORD`, so a shared link opens it too. The panel still finds a craft that a minimum profit or margin hides, so typing a price that drops it below the minimum doesn't close the panel. A link to an item the route or filters don't include opens nothing, and the item is taken out of the link.
