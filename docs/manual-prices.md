# Manual prices

AODP has no price for an item until a player running its client looks at it in that market, so some crafts can't be priced, mostly ones with artifacts and anything sold in the Rests. You can type those prices yourself, or type over any price you think is wrong. In the code, a typed price is a `ManualPrice` in `apps/web/src/manual-prices.types.ts`, and the panel is `apps/web/src/PricesPanel.tsx`.

## Typing a price

The pencil at the end of a row's Prices column opens that craft's prices in a panel over the right of the page, and so does a row's **N prices missing**. It closes on Escape, a click outside it, or ×.

The first line is the item, at the market you sell in. Under it is each material, at the market you buy in, with how many one craft uses. Each line says which order its price comes from, the market, and the price's age: **seen 30 min ago** for AODP's, **typed 2 min ago** for yours, or **missing**. The order follows your [settings](settings.md): buying instantly pays the cheapest **sell order**, and selling instantly or to the Black Market gets the best **buy order**. An empty field shows AODP's price, faintly.

- **Enter** or leaving the field saves the price. The table re-ranks straight away, without asking AODP again.
- **Whole silver above 0** only, such as `1500`. `1.5k` or `1,500` is refused, and the field says so.
- **Escape** cancels what you typed. A second Escape closes the panel.
- **Emptying a field** and pressing Enter removes your price, so AODP's is used again.

For an item with more than one recipe, such as a token instead of its artifact, the panel lists the materials of the recipe the table uses: the most profitable one with all its prices, or the first in the game files while none has them all.

## Which price is used

Your price always wins over AODP's, and counts as fresh however old it is. Its age shows in the table's Prices column like an AODP price's. When AODP can't be reached and the browser has no prices saved from it, the table still shows under the error, priced with yours, and every other price is missing. [ADR-003](adr/003-price-data-strategy.md) describes the order a later release puts in place, where a newer AODP price can replace yours and a badge shows where each price came from.

## Saved, not in the link

Each price is saved for its server, item, market, quality and order, so the same item can have one price in Lymhurst and another in Caerleon, and a price typed on the Europe server doesn't show on the Americas one. The app prices normal quality only, so every price is for quality 1.

The browser saves the prices in IndexedDB, in a database of their own called `aoc-manual-prices`, so **Clear price cache** in the [settings](settings.md) leaves them alone. They aren't in the link: someone who opens your link sees their own. Where IndexedDB isn't available, they last for the visit. A saved price the app can't read is skipped.
