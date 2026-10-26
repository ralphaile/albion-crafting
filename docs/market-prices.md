# Market prices

Live prices come from the [Albion Online Data Project](https://www.albion-online-data.com/) (AODP), which players feed by running its client while they browse the markets.

## Markets

`markets` from `@aoc/market-prices` lists where the app buys and sells: the 7 cities, the Black Market and the 3 Rests. It's written by hand, because AODP's market names aren't in the game files.

- **`id`** is AODP's name. It goes in the `locations` parameter and comes back as `city`. **`name`** is the one the game shows: the market AODP calls `Arthurs Rest Smugglers Network` is "Arthur's Rest".
- **`sellOnly`:** the Black Market only buys from players.
- **`sparseData`:** few players feed AODP from the Rests, so their prices are often missing or old and will need entering by hand.
- **Smuggler's Dens** are left out. AODP has 35 of them, named like the Rests' markets, such as `Deepwood Copse Smugglers Network`.

## Fetching prices

`createAodpClient` from `@aoc/market-prices` fetches current prices from AODP. It only uses `fetch`, so it runs in the browser and in Node.

```ts
import { createAodpClient } from "@aoc/market-prices";

const aodp = createAodpClient({ region: "europe" });
const { prices, failures } = await aodp.getPrices(
  ["T4_BAG", "T5_BAG@1"],
  ["Caerleon", "Black Market"],
  [1, 2],
  { onEvent: (event) => console.log(event) },
);
```

- **`region`** is the game server: `west` (Americas, the default), `europe` or `east` (Asia). Each has its own host, such as `https://europe.albion-online-data.com`. The client's `region` says which one it asks.
- **Markets** are given by their `id`, and **qualities** by number, from 1 to 5. See [quality](glossary.md#quality).
- **Batches:** AODP asks to keep each URL under 4,096 characters, so the item IDs are split across requests, about 170 per request for one market. The server did answer longer URLs in a test, up to 8,193 characters, but the client keeps to AODP's limit.
- **`prices`:** one row per item, market and quality, with AODP's own fields, such as `sell_price_min` and `sell_price_min_date`. Zod checks every row. A missing price is still `0`, dated `0001-01-01T00:00:00`.
- **`failures`:** each batch that failed for good, with its `itemIds` and `error`. The error message has the URL. A failed batch doesn't lose the other batches' prices.
- **`onEvent`** gets three kinds of event, for the UI to show:
  - `progress`: `done` and `total` batches, at the start and after each batch.
  - `waiting`: the `seconds` until the request limits let the next request start.
  - `error`: a batch that failed for good, as in `failures`.

### Request limits

AODP allows 180 requests a minute and 300 every 5 minutes from one IP address. It counts them per clock minute and per 5 clock minutes. Each client keeps under both:

- It starts a request only if fewer than 180 started in the last 60 seconds and fewer than 300 in the last 5 minutes. Counting back from now, instead of per clock minute, means no clock minute can get more than AODP allows.
- At most 3 requests run at once.
- Separate clients, such as two browser tabs, don't know about each other's requests.

### Retries

Each batch gets up to 3 attempts:

- A 5xx response, or a request that never reaches AODP, is retried after a random wait of 0.5–1 s, then 1–2 s. The randomness keeps clients that failed together from retrying together.
- A 429 pauses all of the client's requests until AODP's limit resets, plus 1 s in case the clocks differ. In Node, the reset time comes from the `RateLimit-Reset` header. Browsers can't read it, because AODP doesn't share it with other sites, so they wait until the next minute, the earliest time a limit can reset.
- Any other HTTP error, or a response that isn't the expected prices, fails at once.

## Reading prices

`normalizePrices` turns the rows from `getPrices` into the prices the app uses, as [ADR-003](adr/003-price-data-strategy.md) describes:

```ts
import { normalizePrices } from "@aoc/market-prices";

const itemPrices = normalizePrices(prices, { staleAfterMinutes: 12 * 60 });
// [{ itemId: "T4_BAG", location: "Caerleon", quality: 1,
//    sellMin: { status: "fresh", value: 40000, observedAt: 1792887300000, ageMinutes: 90 },
//    buyMax: { status: "missing" } }]
```

- **`sellMin`** is the cheapest sell order: what you pay to buy instantly, and the reference for a sell order.
- **`buyMax`** is the best buy order: what you get for selling instantly, the reference for a buy order, and the Black Market price.
- **Missing:** a price of `0`, or the date `0001-01-01T00:00:00`, becomes `{ status: "missing" }`, with no value to use by mistake.
- **Dates:** AODP's dates have no timezone and are in UTC. `observedAt` is in milliseconds since 1970, like `Date.now()`.
- **Age and status:** `ageMinutes` counts from `now`, the current time by default, and is never negative. A price is `stale` when it's older than `staleAfterMinutes`, 12 hours by default, and `fresh` otherwise. Both hold for that `now`, so call `normalizePrices` again to bring them up to date.

## Caching prices

The app keeps the prices it fetches in the browser, so it doesn't ask AODP again on every visit. [ADR-002](adr/002-local-first-storage.md) explains why.

```ts
import { pricesNeeded } from "@aoc/core";
import {
  createAodpClient,
  createPriceCache,
  normalizePrices,
  openPriceStore,
} from "@aoc/market-prices";

const { products, materials } = pricesNeeded(recipes);
const store = await openPriceStore();
const cache = createPriceCache({
  client: createAodpClient({ region: "europe" }),
  store,
});

const { prices, failures, fetchedAt } = await cache.getPrices(
  materials,
  ["Lymhurst"],
  [1],
);
const itemPrices = normalizePrices(prices);
```

- **What to fetch:** `pricesNeeded` from `@aoc/core` lists what a set of recipes makes (`products`) and what they use, alternative recipes included (`materials`). Fetch the materials where you buy and the products where you sell, never the whole catalog.
- **Store:** `openPriceStore` saves prices in IndexedDB, in a database of their own called `aoc-price-cache`, with one row per server, item, market and quality. Clearing it can't touch anything else the app saves.
- **No IndexedDB:** when the browser won't open it, as in some private windows, the store keeps prices in memory until the page closes. `store.persistent` is then `false`, so the app can say so.
- **Reuse:** `getPrices` takes the same arguments as the client's. It reuses an item's prices when every market and quality asked for was fetched less than 15 minutes ago, and fetches the other items. `ttlMinutes` changes the 15 minutes. `force: true` fetches everything, for **Refresh prices**.
- **Failures:** when an item's batch fails, its older saved prices are returned anyway, however old, and the batch is in `failures`. `normalizePrices` marks them stale once they're older than 12 hours.
- **Result:** each price is AODP's row plus its `region` and `fetchedAt`, the time it was fetched. The result's `fetchedAt` is the oldest of them, for **Last refreshed**, or `undefined` when there are no prices.
- **`store.clear()`** forgets every saved price, on every server.

## AODP quirks

- Asking for one Rest's market returns all 38 Black Zone markets, the Smuggler's Dens included. The client keeps only the markets it asked for.
- An unknown market name, such as `Arthur's Rest`, comes back as a row with `city` `"0"` and no prices. The client drops it too.
- Market names aren't case-sensitive: asking for `caerleon` returns `Caerleon`. The client compares them the same way.
- A request that doesn't accept gzip gets throttled. Browsers and Node's `fetch` always accept it; with `curl`, pass `--compressed`.
