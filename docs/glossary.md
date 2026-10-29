# Glossary

Albion Online terms used in the code and the app. The numbers are the ones the calculation engine in `packages/core` uses. If the game changes one, the engine and this page change together.

## Artifact

A special material that some weapons, armor and offhands need, found in the world rather than refined, such as the Bloodforged Blade that a Clarent Blade is made with. It's never returned after a craft. Many artifact items can be made with a token instead, such as a Crystallized Spirit. The game files spell it `ARTEFACT`.

## Biome

The landscape of a Black Zone map: Swamp, Forest, Steppe, Highland or Mountain. A hideout's [map quality](#hideout-map-quality) bonus and specialist [power level](#power-level) bonus count only for its biome's 5 crafting categories. Those are the [specialties](#specialty-bonus) of the royal city with the same landscape, such as Thetford for Swamp.

## Black Market

An NPC market in Caerleon that buys gear from players to stock the loot of monsters and chests. You can only sell to it, so its price is its highest buy order. Like any instant sale, it's taxed but has no [setup fee](#setup-fee).

## Crafting location

Where you craft: one of the 7 cities, a [Rest](#rest) or an island. It gives a base [production bonus](#production-bonus) and its [specialty bonus](#specialty-bonus). A hideout is the other place you can craft, and its bonus comes from its [map quality](#hideout-map-quality) and [power level](#power-level). Where you craft is chosen separately from where you trade, the [market](#market). In the code, a crafting location is a `CraftingLocation`, and `CraftingPlace` is a crafting location or a hideout.

## Daily bonus

Extra [production bonus](#production-bonus) the game gives a few crafting categories each day: +0.10 or +0.20. You set up to two in the [settings](settings.md), and the app adds them up if both are for the same category.

## Enchantment

Levels .1 to .4 of an item, written after its tier: 5.1 is a tier 5 item at enchantment 1. Each level is made from materials of the same level and costs more [focus](#focus). Market IDs add the level after an `@`: `T5_MAIN_SWORD@1` is made from `T5_METALBAR_LEVEL1@1`. Level .0 has no suffix.

## FCE

Focus cost efficiency, which grows as you specialize in crafting an item. Every 10,000 FCE halves the [focus](#focus) a craft costs:

```text
focus cost = base focus × 0.5 ^ (FCE / 10000)
```

The engine's version is `focusCost()` in `packages/core/src/focus.helpers.ts`. Until you fill in your specializations, FCE is 0 and a craft costs its full base focus.

## Focus

Points you can spend on a craft to add 0.59 to its [production bonus](#production-bonus), which raises the [return rate](#return-rate-rrr) a lot. How much focus a craft costs depends on the item and your [FCE](#fce). _Silver per focus_ is the extra profit focus brings, per focus point: (profit with focus − profit without) ÷ focus cost. It shows where focus adds the most, so a craft that only pays with focus can rank above one that's profitable anyway. The engine's version is `silverPerFocus()` in `packages/core/src/focus.helpers.ts`. Royal items cost no focus, so they have no silver per focus.

With premium you get 10,000 focus a day, and can store up to 30,000. The engine has these as `FOCUS_PER_DAY` and `MAX_STORED_FOCUS`.

## Fresh, stale and missing prices

How far an API price can be trusted. **Fresh** means AODP saw it in the last 12 hours, **stale** means it's older, and **missing** means AODP has none, because no player running its client has looked at that item in that market. The 12 hours are a [setting](settings.md). A [manual price](manual-prices.md) is fresh for 3 days after you type it, also a setting.

In the table's Prices column and the prices panel, a badge next to each price shows where it came from, in color and with an icon:

| Badge       | Means                         |
| ----------- | ----------------------------- |
| Green check | **API fresh**                 |
| Amber clock | **API stale**                 |
| Blue pencil | **Manual**, a price you typed |
| Red cross   | **Missing**                   |

Hovering a badge names it, with the price and its age. The code is `PriceBadge` in `apps/web/src/PriceBadge.tsx`.

## Hideout map quality

The quality of the Black Zone map a hideout stands on, from Q1 to Q6. It adds 0.01, 0.06, 0.11, 0.16, 0.21 or 0.26 to the [production bonus](#production-bonus) for the 5 crafting categories of the map's [biome](#biome). In a hideout, map quality and [power level](#power-level) take the place of a city's base and [specialty bonus](#specialty-bonus).

## Item value

A value the game gives every item, separate from its market price, worked out from the item values of its materials. Refined materials are worth 16 at T4 and double with each tier and enchantment level. [Artifacts](#artifact) count too. The [station fee](#nutrition-and-station-fee) is based on it.

## Market

Where you buy and sell. You buy materials in one of the 7 cities, and sell in one of them, a [Rest](#rest) or the [Black Market](#black-market). A route has three parts: the market you buy the materials in, the [crafting location](#crafting-location), and the market you sell in ([where you craft, buy and sell](route.md)). In the code, a market is its AODP ID from `markets` in `@aoc/market-prices`, such as `Arthurs Rest Smugglers Network`, and its name is what the app shows, such as Arthur's Rest.

## Material cost

What one craft's materials cost after the [return rate](#return-rate-rrr). Returnable materials count as `count × (1 − RRR)`, and [artifacts](#artifact) and tokens count in full:

```text
material cost = Σ returnable: count × (1 − RRR) × unit price
              + Σ others:     count × unit price
```

The unit price depends on how you buy at the buy market:

- **Instant buy:** the lowest sell order.
- **Buy order:** the highest buy order, plus the [setup fee](#setup-fee).

The cost is per craft, so it scales to a batch. A staff that needs 8 metal bars, crafted at a 24.81% return rate, uses 8 × 0.7519 ≈ 6.02 bars per craft on average. So 100 staffs use about 602 bars, not 800, because the returned bars go into the next crafts. They still need all 100 artifacts.

The engine's version is `materialCost()` in `packages/core/src/material-cost.helpers.ts`. It returns a line per material, with its count after returns, the price it used, its unit price and its cost. A [stale](#fresh-stale-and-missing-prices) price still counts, and its line stays flagged. If any price is missing, the result is incomplete and has no total.

## Nutrition and station fee

Crafting stations run on nutrition. A craft uses `item value × 0.1125` nutrition, and the station's owner sets a price in silver per 100 nutrition:

```text
station fee = item value × 0.1125 × fee per 100 nutrition / 100
```

The engine's version is `stationFee()` in `packages/core/src/station-fee.helpers.ts`. It gives the fee for one craft, and every recipe crafts one item. A fee of 0, such as on your own island, costs nothing. The shapeshifter staffs have no [item value](#item-value), so at a paid station their fee is unknown. The fee is a [setting](settings.md), 500 by default, because station owners set anything from 0 to about 1,000.

## Power level

A hideout's power level, from 1 to 9, adds to its [production bonus](#production-bonus) in two parts: a general bonus for everything crafted there, and a specialist bonus for its [biome](#biome)'s 5 crafting categories. At level 9 they're 0.26 and 0.30. A level 9 hideout on a quality 6 map, crafting its specialty, reaches a production bonus of 0.82, or 1.41 with [focus](#focus).

## Production bonus

The total crafting bonus where you craft, written as a fraction (0.18 is 18%). Called _B_ in formulas. It decides the [return rate](#return-rate-rrr).

- **City or [Rest](#rest):** a base of 0.18, plus 0.15 for its [specialty](#specialty-bonus), plus any [daily bonus](#daily-bonus), plus 0.59 with [focus](#focus).
- **Island:** a base of 0, with no specialty.
- **Hideout:** the [power level](#power-level)'s general bonus, plus, for its [biome](#biome)'s 5 categories, the [map quality](#hideout-map-quality) bonus and the power level's specialist bonus. Then any daily bonus, and 0.59 with focus.

The engine's version for cities, Rests and islands is `productionBonus()` in `packages/core/src/production-bonus.helpers.ts`. It returns each part on its own.

For hideouts it's `hideoutProductionBonus()` in `packages/core/src/hideout-bonus.helpers.ts`. It takes the hideout's [biome](#biome), [map quality](#hideout-map-quality) and [power level](#power-level) as their rows from `@aoc/crafting-data`, and works like `productionBonus()` otherwise.

For a `CraftingPlace`, either kind, `placeProductionBonus()` in `packages/core/src/place-bonus.helpers.ts` calls the right one of the two. `evaluate()` uses it.

## Profit and margin

What one crafted item earns you, after everything it cost:

```text
profit = revenue − (material cost + station fee + silver) / amount crafted
margin = profit / ((material cost + station fee + silver) / amount crafted)
```

Every recipe crafts one item, so the amount crafted is always 1 for now. The [revenue](#revenue), [material cost](#material-cost) and [station fee](#nutrition-and-station-fee) are the entries above.

The engine's version is `evaluate()` in `packages/core/src/evaluate.helpers.ts`. It works out a recipe for where you craft, your settings, and the prices at your buy and sell markets:

- An item with alternative recipes, such as a token instead of its [artifact](#artifact) or another base piece for a royal item, is evaluated with each, and the most profitable one with all its prices is kept.
- A missing price, or a missing [item value](#item-value) at a paid station, makes the result incomplete. It lists the missing prices and has no profit.
- With focus on, it also gives the focus cost and [silver per focus](#focus).

`rank()` in `packages/core/src/rank.helpers.ts` sorts the results by profit, margin or silver per focus, highest first, with incomplete ones last. By default it sorts by silver per focus when focus is on, and by profit otherwise.

## Quality

How well a crafted item came out, from 1 to 5: Normal, Good, Outstanding, Excellent or Masterpiece. Crafting gives a random quality, and each quality has its own market price, so AODP prices are asked for per quality. Not the same as [hideout map quality](#hideout-map-quality).

## Rest

Arthur's, Merlyn's and Morgana's Rest: towns in the Black Zone with a market and crafting stations. Crafting there works like in a city, with its own [specialties](#specialty-bonus). AODP calls their markets "Arthurs Rest Smugglers Network" and so on, and has few prices for them.

## Return rate (RRR)

Resource return rate: the share of returnable materials you get back after a craft. Artifacts and tokens are never returned, so they always cost their full price.

```text
RRR = B / (1 + B)
```

| Where you craft                               | B    | RRR   |
| --------------------------------------------- | ---- | ----- |
| City                                          | 0.18 | 15.3% |
| City, its specialty                           | 0.33 | 24.8% |
| City, with focus                              | 0.77 | 43.5% |
| City, its specialty, with focus               | 0.92 | 47.9% |
| Level 9 hideout, quality 6 map, its specialty | 0.82 | 45.1% |
| The same, with focus                          | 1.41 | 58.5% |
| Level 9 hideout, quality 6 map, another item  | 0.26 | 20.6% |

The engine's version is `returnRate()` in `packages/core/src/return-rate.helpers.ts`. Next to it, `bonusForReturnRate()` turns a return rate back into the production bonus that gives it.

## Revenue

The silver you keep from selling a crafted item, after the [tax](#tax-and-premium) and any [setup fee](#setup-fee). It depends on how you sell:

| Sell mode    | Price                                                          | You keep                  |
| ------------ | -------------------------------------------------------------- | ------------------------- |
| Sell order   | The lowest sell order at the sell market, or 1 silver under it | price × (1 − tax − 0.025) |
| Instant sale | The highest buy order at the sell market                       | price × (1 − tax)         |
| Black Market | The [Black Market](#black-market)'s highest buy order          | price × (1 − tax)         |

The engine's version is `revenue()` in `packages/core/src/revenue.helpers.ts`. It returns the price, the tax, the setup fee and what you keep. A [stale](#fresh-stale-and-missing-prices) price still counts, and stays flagged. If the price it needs is missing, so is the revenue, and the craft's result is incomplete.

## Setup fee

2.5% of an order's value, charged when you place a sell order or a buy order. Buying or selling instantly, including to the [Black Market](#black-market), has no setup fee. Buying materials by buy order adds it to each material's [cost](#material-cost). It isn't refunded if you cancel the order.

## Specialty bonus

Each city and [Rest](#rest) specializes in some crafting categories, such as swords in Lymhurst. Crafting one of them there adds 0.15 to the [production bonus](#production-bonus). Islands have no specialty. A hideout's specialties are its [biome](#biome)'s 5 categories, which get its [map quality](#hideout-map-quality) and specialist [power level](#power-level) bonuses. `hasSpecialty()` in `packages/core/src/specialty.helpers.ts` says whether a place gives a category its specialty, and the table marks those crafts **Specialty**.

## Tax and premium

Every market sale is taxed: 4% with premium, Albion's paid subscription, or 8% without. Premium is a [setting](settings.md).
