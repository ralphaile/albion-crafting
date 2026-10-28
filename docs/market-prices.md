# Market prices

Live prices come from the [Albion Online Data Project](https://www.albion-online-data.com/) (AODP), which players feed by running its client while they browse the markets. `@aoc/market-prices` gives the app two things: `markets`, where it trades, and `openMarketData`, which fetches prices and price history, keeps them in the browser and keeps to AODP's request limits.

## Markets

`markets` lists where the app buys and sells: the 7 cities, the Black Market and the 3 Rests. It's written by hand, because AODP's market names aren't in the game files.

- **`id`** is AODP's name for the market. Pass it in `marketIds`, and results give it back as `marketId`. **`name`** is the one the game shows: the market AODP calls `Arthurs Rest Smugglers Network` is "Arthur's Rest".
- **`sellOnly`:** the Black Market only buys from players.
- **`sparseData`:** few players feed AODP from the Rests, so their prices are often missing or old and will need entering by hand.
- **Smuggler's Dens** are left out. AODP has 35 of them, named like the Rests' markets, such as `Deepwood Copse Smugglers Network`.

## Opening market data

```ts
import { openMarketData } from "@aoc/market-prices";

const marketData = await openMarketData();
```

- **One at a time:** prices and history share one AODP client, so they share its request limits, on every server. Open market data once and pass it around. A second one, such as in another browser tab, has limits of its own.
- **Saved in the browser:** prices and history go in IndexedDB, in a database of their own called `aoc-price-cache`, so clearing it can't touch anything else the app saves. [ADR-002](adr/002-local-first-storage.md) explains why.
- **`persistent`** is `false` when the browser won't open IndexedDB, as in some private windows. Prices are then kept in memory until the page closes, and the app can say so.
- **`clear()`** forgets every saved price and all history, on every server.

## Prices

```ts
const { prices, failures, fetchedAt } = await marketData.getPrices(
  ["T4_BAG", "T5_BAG@1"],
  ["Caerleon", "Black Market"],
  [1, 2],
  { onEvent: (event) => console.log(event) },
);
// [{ itemId: "T4_BAG", marketId: "Caerleon", quality: 1,
//    sellMin: { status: "fresh", value: 40000, observedAt: 1792887300000, ageMinutes: 90 },
//    buyMax: { status: "fresh", value: 3505, observedAt: 1792887300000, ageMinutes: 90 } }, …]
```

- **What to ask for:** `pricesNeeded` from `@aoc/core` lists what a set of recipes makes (`products`) and what they use, alternative recipes included (`materials`). Ask for the materials where you buy and the products where you sell, never the whole catalog.
- **Markets** are given by their `id`, and **qualities** by number, from 1 to 5. See [quality](glossary.md#quality).
- **`region`** is the game server: `west` (Americas, the default), `europe` or `east` (Asia). Each has its own AODP host, such as `https://europe.albion-online-data.com`, and its own saved prices.
- **`prices`:** one per item, market and quality, as [ADR-003](adr/003-price-data-strategy.md) describes. They fit `OrderPrices` from `@aoc/core`, so they go into its calculations as they are.
  - **`sellMin`** is the cheapest sell order: what you pay to buy instantly, and the reference for a sell order.
  - **`buyMax`** is the best buy order: what you get for selling instantly, the reference for a buy order, and the Black Market price.
  - **Missing:** when AODP has no price, it's `{ status: "missing" }`, with no value to use by mistake.
  - **`observedAt`** is when AODP saw the price, in milliseconds since 1970, like `Date.now()`.
  - **`ageMinutes` and `status`** are worked out on every call, reused prices included. A price is `stale` once it's older than `staleAfterMinutes`, 12 hours by default, and `fresh` before that.
- **Reuse:** an item's prices are reused when every market and quality asked for was fetched less than 15 minutes ago, even after a reload. The other items are fetched. `force: true` fetches everything, for **Refresh prices**.
- **`failures`:** each batch of items that failed for good, with its `itemIds` and `error`. The error message has the URL. Those items keep their older saved prices, however old, and the other batches' prices aren't lost.
- **`fetchedAt`** is when the oldest of the prices was fetched, for **Last refreshed**, or `undefined` when there are none.
- **`onEvent`** gets three kinds of event, for the UI to show:
  - `progress`: `done` and `total` batches, at the start and after each batch.
  - `waiting`: the `seconds` until the request limits let the next request start.
  - `error`: a batch that failed for good, as in `failures`.

## Price history

```ts
const { history } = await marketData.getHistory(["T4_BAG"], ["Caerleon"], [1]);
// [{ itemId: "T4_BAG", marketId: "Caerleon", quality: 1,
//    averagePrice: 4441.15, averageDailyVolume: 155, newestDay: 1792281600000 }]
```

- **Arguments:** the same as `getPrices`, with `days` in place of `staleAfterMinutes`. It returns `{ history, failures, fetchedAt }`.
- **Reuse:** history is reused for 6 hours. Ask for it only for the results on screen, such as the top 100, not for every recipe.
- **From AODP's daily history** (`time-scale=24`), averaged over its newest 7 days. `days` changes the 7.
  - `averageDailyVolume`: how many sold in those days, divided by 7. A day without a point counts as none sold.
  - `averagePrice`: the average sale price, weighted by how many sold each day, or `undefined` when none sold.
  - `newestDay`: the newest day AODP has, in milliseconds since 1970, or `undefined` when it has none.
- **The newest 7 days, not the last 7:** AODP only learns a market's history when a player opens it in the game, so it can be days behind. On 2026-10-26, the newest day for T4_BAG in Caerleon was 10-18. Counting back from today would read that as nothing sold. Compare `newestDay` with today to tell how old the history is.
- **Up to about 3 weeks:** AODP keeps about 30 days of history, counted back from today rather than from the newest day. A longer window can reach past what AODP still has, and those days would count as none sold.

## Behind `openMarketData`

### Batches

AODP asks to keep each URL under 4,096 characters, so the item IDs are split across requests, about 170 per request for one market. The server did answer longer URLs in a test, up to 8,193 characters, but the client keeps to AODP's limit. Zod checks every row AODP sends back.

### Request limits

AODP allows 180 requests a minute and 300 every 5 minutes from one IP address. It counts them per clock minute and per 5 clock minutes. The client keeps under both:

- It starts a request only if fewer than 180 started in the last 60 seconds and fewer than 300 in the last 5 minutes. Counting back from now, instead of per clock minute, means no clock minute can get more than AODP allows.
- At most 3 requests run at once.

### Retries

Each batch gets up to 3 attempts:

- A 5xx response, or a request that never reaches AODP, is retried after a random wait of 0.5–1 s, then 1–2 s. The randomness keeps clients that failed together from retrying together.
- A 429 pauses all of the client's requests until AODP's limit resets, plus 1 s in case the clocks differ. In Node, the reset time comes from the `RateLimit-Reset` header. Browsers can't read it, because AODP doesn't share it with other sites, so they wait until the next minute, the earliest time a limit can reset.
- Any other HTTP error, or a response that isn't the expected prices or history, fails at once.

### What's saved

- **One row per server, item, market and quality,** in the `prices` and `history` tables, as AODP sent it, plus when it was fetched.
- **Nothing back:** when AODP sends nothing for an item, market and quality it was asked about, an empty row is saved instead: a price with no data, or a series with no points. It's reused like any other row, so an item nobody buys isn't asked for on every call. A failed batch gets no empty row.

## AODP quirks

- Asking for one Rest's market returns all 38 Black Zone markets, the Smuggler's Dens included. The client keeps only the markets it asked for.
- An unknown market name, such as `Arthur's Rest`, comes back as a row with `city` `"0"` and no prices. The client drops it too.
- Market names aren't case-sensitive: asking for `caerleon` returns `Caerleon`. Saved prices are matched the same way.
- AODP writes a missing price as `0`, dated `0001-01-01T00:00:00`. Its dates have no timezone and are in UTC.
- History has no series for an item, market and quality where nothing sold: asking for `T8_BAG_INSIGHT@4` in Thetford returns an empty list, not a series of zeros.
- A request that doesn't accept gzip gets throttled. Browsers and Node's `fetch` always accept it; with `curl`, pass `--compressed`.
