# ADR-001: A monorepo with a pure calculation core

- **Status:** Accepted
- **Date:** 2026-10-25

## Context

The web app is the first of three ways to use the same calculations. A backend API and a Discord bot are planned for a later release, and all three have to give the same answer for the same recipe, route and settings. The calculations are also where a mistake costs real silver, so they need to be easy to test on their own.

## Decision

- **One repository** with pnpm workspaces and Turborepo.
  - `apps/*` are the things that run: `apps/web` today, and later `apps/api` (Fastify with Postgres) and `apps/discord-bot`.
  - `packages/*` are the libraries the apps share: `core`, `market-prices`, `crafting-data`, and the shared TypeScript and ESLint settings.
- **`@aoc/core` is pure.** It takes data in and returns results, with no network, storage, browser or Node code. Prices and game data are loaded by the other packages and the apps, then passed in.
- **`pnpm check:deps` enforces the boundaries** on every PR, with these dependency-cruiser rules:
  - `core-stays-pure`: core imports nothing outside its own folder, not even npm packages.
  - `no-app-to-app`: apps never import each other. Shared code moves into a package.
  - `no-deep-imports`: other code uses a package only through its public entry point.
  - `no-relative-imports-across-workspaces` and `no-circular`: workspaces depend on each other by package name, and nothing imports in a circle.

## Consequences

- The API and the bot will run the same engine the web app tests, not a copy of it.
- Core is tested without mocks, so its tests are fast and repeatable, and it has the highest coverage minimum (90%).
- One PR can change the engine and the screen that shows it, and CI checks both together.
- Everything core needs has to come from its caller, including prices, recipes and the current time.
- Core can't use npm packages. Whatever it needs, it writes itself.
- The tooling costs upkeep: workspaces, Turborepo tasks and the boundary rules.
