# Glossary

Albion Online terms used in the code and the app. The numbers are the ones the calculation engine in `packages/core` uses. If the game changes one, the engine and this page change together.

## Artifact

A special material that some weapons, armor and offhands need, found in the world rather than refined, such as the Bloodforged Blade that a Clarent Blade is made with. It's never returned after a craft. Many artifact items can be made with a token instead, such as a Crystallized Spirit. The game files spell it `ARTEFACT`.

## Biome

The landscape of a Black Zone map: Swamp, Forest, Steppe, Highland or Mountain. A hideout's [map quality](#hideout-map-quality) bonus and specialist [power level](#power-level) bonus count only for its biome's 5 crafting categories. Those are the [specialties](#specialty-bonus) of the royal city with the same landscape, such as Thetford for Swamp.

## Black Market

An NPC market in Caerleon that buys gear from players to stock the loot of monsters and chests. You can only sell to it, so its price is its highest buy order. Like any instant sale, it's taxed but has no [setup fee](#setup-fee).

## Daily bonus

Extra [production bonus](#production-bonus) the game gives a few crafting categories each day: +0.10 or +0.20. The app takes up to two.

## Enchantment

Levels .1 to .4 of an item, written after its tier: 5.1 is a tier 5 item at enchantment 1. Each level is made from materials of the same level and costs more [focus](#focus). Market IDs add the level after an `@`: `T5_MAIN_SWORD@1` is made from `T5_METALBAR_LEVEL1@1`. Level .0 has no suffix.

## FCE

Focus cost efficiency, which grows as you specialize in crafting an item. Every 10,000 FCE halves the [focus](#focus) a craft costs:

```text
focus cost = base focus × 0.5 ^ (FCE / 10000)
```

## Focus

Points you can spend on a craft to add 0.59 to its [production bonus](#production-bonus), which raises the [return rate](#return-rate-rrr) a lot. How much focus a craft costs depends on the item and your [FCE](#fce). _Silver per focus_ (profit with focus ÷ focus cost) shows which crafts make the most of it.

## Hideout map quality

The quality of the Black Zone map a hideout stands on, from Q1 to Q6. It adds 0.01, 0.06, 0.11, 0.16, 0.21 or 0.26 to the [production bonus](#production-bonus) for the 5 crafting categories of the map's [biome](#biome). In a hideout, map quality and [power level](#power-level) take the place of a city's base and [specialty bonus](#specialty-bonus).

## Item value

A value the game gives every item, separate from its market price, worked out from the item values of its materials. Refined materials are worth 16 at T4 and double with each tier and enchantment level. [Artifacts](#artifact) count too. The [station fee](#nutrition-and-station-fee) is based on it.

## Nutrition and station fee

Crafting stations run on nutrition. A craft uses `item value × 0.1125` nutrition, and the station's owner sets a price in silver per 100 nutrition:

```text
station fee = item value × 0.1125 × fee per 100 nutrition / 100
```

## Power level

A hideout's power level, from 1 to 9, adds to its [production bonus](#production-bonus) in two parts: a general bonus for everything crafted there, and a specialist bonus for its [biome](#biome)'s 5 crafting categories. At level 9 they're 0.26 and 0.30. A level 9 hideout on a quality 6 map, crafting its specialty, reaches a production bonus of 0.82, or 1.41 with [focus](#focus).

## Production bonus

The total crafting bonus where you craft, written as a fraction (0.18 is 18%). Called _B_ in formulas. It decides the [return rate](#return-rate-rrr).

- **City or [Rest](#rest):** a base of 0.18, plus 0.15 for its [specialty](#specialty-bonus), plus any [daily bonus](#daily-bonus), plus 0.59 with [focus](#focus).
- **Island:** a base of 0, with no specialty.
- **Hideout:** the [power level](#power-level)'s general bonus, plus, for its [biome](#biome)'s 5 categories, the [map quality](#hideout-map-quality) bonus and the power level's specialist bonus. Then any daily bonus, and 0.59 with focus.

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

The engine's version is `returnRate()` in `packages/core/src/return-rate.ts`.

## Setup fee

2.5% of an order's value, charged when you place a sell order or a buy order. Buying or selling instantly, including to the [Black Market](#black-market), has no setup fee.

## Specialty bonus

Each city and [Rest](#rest) specializes in some crafting categories, such as swords in Lymhurst. Crafting one of them there adds 0.15 to the [production bonus](#production-bonus). Islands have no specialty.

## Tax and premium

Every market sale is taxed: 4% with premium, Albion's paid subscription, or 8% without.
