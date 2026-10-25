# Market prices

Live prices come from the [Albion Online Data Project](https://www.albion-online-data.com/) (AODP), which players feed by running its client while they browse the markets.

## Markets

`markets` from `@aoc/market-prices` lists where the app buys and sells: the 7 cities, the Black Market and the 3 Rests. It's written by hand, because AODP's market names aren't in the game files.

- **`id`** is AODP's name. It goes in the `locations` parameter and comes back as `city`. **`name`** is the one the game shows: the market AODP calls `Arthurs Rest Smugglers Network` is "Arthur's Rest".
- **`sellOnly`:** the Black Market only buys from players.
- **`sparseData`:** few players feed AODP from the Rests, so their prices are often missing or old and will need entering by hand.
- **Smuggler's Dens** are left out. AODP has 35 of them, named like the Rests' markets, such as `Deepwood Copse Smugglers Network`.

## AODP quirks

- Asking for one Rest's market returns all 38 Black Zone markets, the Smuggler's Dens included, so filter the results by `city`.
- A request that doesn't accept gzip gets throttled. Browsers and Node's `fetch` always accept it; with `curl`, pass `--compressed`.
