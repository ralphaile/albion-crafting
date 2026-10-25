# Albion Crafting

Find the most profitable items to craft in Albion Online for a route you choose: where you craft, where you buy materials and where you sell, including the Black Market. Market prices come from the [Albion Online Data Project](https://www.albion-online-data.com/), with manual entry where the data is missing. Recipes and crafting bonuses come from [ao-bin-dumps](https://github.com/ao-data/ao-bin-dumps).

> **Status:** early development. The project skeleton is in place, and features are added ticket by ticket.

## Getting started

Requires Node.js 24.22.1, the version pinned in `.nvmrc`. pnpm comes from Corepack, which ships with Node.

```sh
nvm install 24.22.1
nvm use 24.22.1
corepack enable pnpm
pnpm install
pnpm dev   # http://localhost:5173
```

## Scripts

| Command               | What it does                                                           |
| --------------------- | ---------------------------------------------------------------------- |
| `pnpm dev`            | Starts the web app with live reload                                    |
| `pnpm build`          | Builds all packages and the web app                                    |
| `pnpm typecheck`      | Checks types in all packages                                           |
| `pnpm lint`           | Lints all packages                                                     |
| `pnpm test`           | Runs the unit and component tests once                                 |
| `pnpm test:watch`     | Reruns the tests when files change                                     |
| `pnpm coverage`       | Runs the tests and fails if a package drops below its coverage minimum |
| `pnpm e2e`            | Runs the end-to-end tests                                              |
| `pnpm format`         | Formats the code                                                       |
| `pnpm format:check`   | Checks formatting without changing files                               |
| `pnpm check:deps`     | Checks which packages may import which                                 |
| `pnpm check:unused`   | Finds unused files, exports and dependencies                           |
| `pnpm check:versions` | Checks that shared dependencies use the same version everywhere        |
| `pnpm data:update`    | Downloads the game data                                                |

`e2e` and `data:update` are placeholders until their tickets are done.

## Project layout

A pnpm + Turborepo monorepo. The web app uses Vite and React.

| Folder                       | What it is                                                                                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web`                   | The website: pick a route and settings, and get a ranked list of the best crafts                                                                                    |
| `packages/core`              | The calculation engine: return rate, costs, fees, taxes, focus, profit and ranking. It has no network or storage code, so a future API and Discord bot can reuse it |
| `packages/market-prices`     | Fetches live market prices from the Albion Online Data Project (AODP) API                                                                                           |
| `packages/crafting-data`     | Recipes, item values, locations and crafting bonuses, extracted from the game files                                                                                 |
| `packages/config-typescript` | Shared strict TypeScript settings                                                                                                                                   |
| `packages/config-eslint`     | Shared lint rules                                                                                                                                                   |

Albion Crafting is a fan project and is not affiliated with or endorsed by Sandbox Interactive GmbH. Albion Online is their trademark.
