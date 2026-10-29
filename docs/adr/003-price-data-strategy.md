# ADR-003: Where prices come from and which one is used

- **Status:** Accepted. Its order for which price is used is superseded by [ADR-006](006-newer-price-wins.md).
- **Date:** 2026-10-25

## Context

Market prices come from the [Albion Online Data Project](https://www.albion-online-data.com/) (AODP). Players run a client that uploads what they see on the market, so a price only exists where someone looked recently. Black Zone markets and rare artifacts often have none.

What the API does, checked against the live service:

- There's one host per game server: `west`, `europe` and `east.albion-online-data.com`.
- It allows requests from any website (CORS `*`), so the browser can call it directly.
- "No data" comes back as a price of `0` with the date `0001-01-01T00:00:00`. Dates have no timezone and are in UTC.
- The limits are 180 requests a minute and 300 every 5 minutes. A URL can be at most 4,096 characters, which fits about 150 item IDs.
- A current price can be far off: a T4 bag in Caerleon once showed 17,999 against a history average of about 4,700.

A result is only worth trusting if every price in it is real, and you can tell where each one came from.

## Decision

**Fetching**

- The browser calls AODP for the server picked in the settings, Americas (`west`) by default.
- It only asks for what the current route and filters need: the items and their materials, never the whole catalog.
- Requests are batched to fit the URL limit, a rate limiter keeps them under both request limits, and failed requests are retried.
- Prices are cached as described in [ADR-002](002-local-first-storage.md) and reused for 15 minutes. **Refresh prices** fetches them again.

**Reading an API price**

- A `0` price or the `0001-01-01` date means **missing**.
- Each price keeps its value, when it was seen, and how old it is.
- A price older than 12 hours is **stale**. The threshold is a setting.
- Two prices are kept for each item, market and quality:
  - `sellMin`, the cheapest sell order: what you pay to buy instantly, and the reference for a sell order.
  - `buyMax`, the best buy order: what you get for selling instantly, the reference for a buy order, and the Black Market price.

**Manual prices**

- You can type a price for any item, market, quality and side (buy or sell). It's saved with the time you entered it.
- A manual price older than 3 days counts as stale. That's a setting too.

**Which price is used**

A pure function in `@aoc/core` picks one, in this order:

1. The manual price, if it's newer than the API's, or the API price is missing or stale
2. A fresh API price
3. A stale API price
4. Nothing: the price is missing

With **Always prefer my manual prices** on, a manual price wins whenever there is one.

Every price on screen has a badge: **API fresh**, **API stale** (with its age), **Manual** (with its age) or **Missing**. When an API price and a manual price both exist, the tooltip shows both.

**Missing prices**

If any price is missing, the result is marked incomplete and lists what's missing. The engine never fills in a guess.

## Consequences

- There's no backend and no API key. Each user's requests come from their own browser, so the rate limits apply per user.
- You can always finish an incomplete result by hand, which matters most in the Black Zone.
- Older API data never replaces a manual price, because the newer price wins. A newer API price does replace it, unless **Always prefer my manual prices** is on.
- The badges show every price's source and age, so a stale or typed-in price is never mistaken for a fresh one.
- Outliers aren't caught yet, so one odd order can push an item to the top. Price history (volume and average price) comes in a later release to spot them.
- The request limits cap how fast a large selection refreshes.
