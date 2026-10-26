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
const prices = await aodp.getPrices(
  ["T4_BAG", "T5_BAG@1"],
  ["Caerleon", "Black Market"],
  [1, 2],
);
```

- **`region`** is the game server: `west` (Americas, the default), `europe` or `east` (Asia). Each has its own host, such as `https://europe.albion-online-data.com`.
- **Markets** are given by their `id`, and **qualities** by number, from 1 to 5. See [quality](glossary.md#quality).
- **Batches:** AODP asks to keep each URL under 4,096 characters, so the item IDs are split across requests, about 170 per request for one market. The server did answer longer URLs in a test, up to 8,193 characters, but the client keeps to AODP's limit. Requests run one at a time.
- **What comes back:** one row per item, market and quality, with AODP's own fields, such as `sell_price_min` and `sell_price_min_date`. Zod checks every row. A missing price is still `0`, dated `0001-01-01T00:00:00`.
- **Errors:** an HTTP error or a row with unexpected fields fails the whole call, with the URL in the message.

## AODP quirks

- Asking for one Rest's market returns all 38 Black Zone markets, the Smuggler's Dens included. The client keeps only the markets it asked for.
- An unknown market name, such as `Arthur's Rest`, comes back as a row with `city` `"0"` and no prices. The client drops it too.
- Market names aren't case-sensitive: asking for `caerleon` returns `Caerleon`. The client compares them the same way.
- A request that doesn't accept gzip gets throttled. Browsers and Node's `fetch` always accept it; with `curl`, pass `--compressed`.
