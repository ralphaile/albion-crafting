# ADR-004: Core owns the types it shares with the data packages

- **Status:** Accepted
- **Date:** 2026-10-26

## Context

Core's calculations take recipes, crafting locations and prices, and `crafting-data` and `market-prices` produce them. Each package used to declare its own version of these types, under its own names: a recipe's materials were a `Resource` in one package and a `Material` in the other, and where you craft was a `CraftingSite`, a `CraftingLocation` or a `location`. Nothing checked that what the data packages produce fits what core takes, so a change on one side would only show up in the app.

## Decision

- **Core declares the types its calculations take:** `Recipe`, `RecipeAlternative`, `Material`, `CraftingLocation`, `MarketPrice` and `OrderPrices`.
- **The data packages build on them.** `crafting-data` and `market-prices` import these types from `@aoc/core` with `import type`, and extend them where they know more:
  - `GameRecipe` adds the item facts the filters need, such as tier and shop category.
  - `ItemPrices` adds which item, market and quality the prices are for, and how old each one is.
- **Dependencies point to core, never away from it.** Core still imports nothing ([ADR-001](001-monorepo-with-a-pure-core.md)).
- **One name per idea** across the packages, as the [glossary](../glossary.md) uses it.

## Consequences

- If core's types change, the data packages stop compiling, before the app gets data that doesn't fit.
- Game data and prices go into core's functions as they are, with no conversion in the app.
- Each shared type has one place to import it from, `@aoc/core`. The data packages don't re-export it.
- `import type` is erased before the code runs, so the data scripts still run on Node without core being built.
- Core's types carry what the packages share even where the calculations don't use it, such as a crafting location's `id` and `name`.
