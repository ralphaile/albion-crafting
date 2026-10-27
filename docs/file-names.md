# File names

A source file's ending says what it exports, so you can tell what a file holds before opening it.

| Ending          | Holds                                                                             | Example                                     |
| --------------- | --------------------------------------------------------------------------------- | ------------------------------------------- |
| `.types.ts`     | Only types and interfaces                                                         | `packages/core/src/revenue.types.ts`        |
| `.constants.ts` | Fixed values and defaults                                                         | `apps/web/src/settings.constants.ts`        |
| `.helpers.ts`   | Functions                                                                         | `packages/core/src/revenue.helpers.ts`      |
| `.client.ts`    | Functions that talk to a server                                                   | `packages/market-prices/src/aodp.client.ts` |
| `.store.ts`     | Functions that keep data in the browser, in IndexedDB                             | `apps/web/src/saved-filters.store.ts`       |
| `.schema.ts`    | Zod schemas, the types inferred from them, and the functions that parse with them | `apps/web/src/filters.schema.ts`            |

## Rules

- One kind per file. A file with types and functions is split, including a function's own option and result types: `revenue.ts` became `revenue.types.ts` and `revenue.helpers.ts`.
- Only exports count. A client can keep its batching code and a store its database setup, as long as they aren't exported.
- A function that calls a server goes in `.client.ts`, one that reads or writes IndexedDB in `.store.ts`, and one that checks outside data with Zod in `.schema.ts`, so code that touches the network, storage or untrusted input is easy to find. Any other function goes in `.helpers.ts`.
- A schema's inferred type stays in its `.schema.ts`, next to the schema it comes from.
- Other packages import a package through its `index.ts`, so moving a file inside it doesn't change their imports.
- If a constants file needs a helper that reads those same constants, give the helper its own file, as `armor.helpers.ts` is for `filters.constants.ts`. `pnpm check:deps` fails on an import loop.

## Names that stay plain

- Components and their CSS Modules: `CraftsTable.tsx`, `CraftsTable.module.css`.
- Hooks: `useBestCrafts.ts`.
- Tests, named after what they test without its ending: `revenue.test.ts` for `revenue.helpers.ts`. See [testing](testing.md#naming).
- Each package's `index.ts`, which only re-exports.
- Entry points: `apps/web/src/main.tsx`, and the `data-update.ts` and `data-diff.ts` scripts that `pnpm data:update` and `pnpm data:diff` run.
- Test support in `test/` and `e2e/`, and config files.
