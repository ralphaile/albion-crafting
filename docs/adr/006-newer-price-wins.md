# ADR-006: The newer price wins, and a typed price goes stale

- **Status:** Accepted
- **Date:** 2026-10-28

## Context

[ADR-003](003-price-data-strategy.md) picks between an API price and a manual one in this order: the manual price if it's newer, or if the API price is missing or stale. Building it showed two cases where that order gets it wrong:

- **Both stale:** a price typed weeks ago still beats one AODP saw yesterday, because the API price is stale. The older price wins.
- **Manual stale, API fresh:** a typed price past its stale time still beats a fresh API price whenever it's the newer one. That can happen when the manual stale time is set shorter than the API's. The manual stale time then changes nothing.

## Decision

`choosePrice()` in `packages/core/src/price-choice.helpers.ts` picks, in this order:

1. The manual price, when the API price is missing
2. The fresh price, when one is fresh and the other stale
3. Otherwise the newer price. A tie goes to the API price.

With **Always prefer my manual prices** on, a manual price wins whenever there is one, as before.

## Consequences

- Both prices are judged the same way: each goes stale after its own time, and between two equally trusted prices the newer one wins.
- A typed price only lasts until its stale time, 3 days by default. After that, a fresh API price replaces it.
- Keeping an old typed price takes **Always prefer my manual prices**.
