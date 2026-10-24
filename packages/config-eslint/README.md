# @aoc/eslint-config

Shared ESLint rules. Each workspace picks presets in its `eslint.config.js`:

```js
import { defineConfig } from "eslint/config";

import { react } from "@aoc/eslint-config/react";
import { test } from "@aoc/eslint-config/test";

export default defineConfig(react, test);
```

| Preset  | Use it for                                                                                    |
| ------- | --------------------------------------------------------------------------------------------- |
| `base`  | Code that must run anywhere (browser, server, bot): no Node built-ins such as `fs`            |
| `node`  | `base` plus Node globals and built-ins, for scripts and tools                                 |
| `react` | `base` plus React, React Hooks and accessibility rules                                        |
| `test`  | Vitest rules and relaxations for test files. It adds to another preset, so never use it alone |

## Why each rule exists

| Rule                                                  | Why                                                                                                                                                                                                                                                            |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| typescript-eslint `strictTypeChecked`                 | Uses the type checker to find bugs, such as a promise nobody awaits (`no-floating-promises`), an async function passed where a plain callback is expected (`no-misused-promises`) and a check that is always true or always false (`no-unnecessary-condition`) |
| typescript-eslint `stylisticTypeChecked`              | One way to write common TypeScript patterns, such as `??` instead of `\|\|` for defaults                                                                                                                                                                       |
| `@typescript-eslint/switch-exhaustiveness-check`      | A `switch` over a union must handle every member, so adding a new value is an error at every `switch` that misses it                                                                                                                                           |
| `@typescript-eslint/consistent-type-imports`          | Type-only imports use `import type`, so they disappear from the built code and can't load a module by accident                                                                                                                                                 |
| `eqeqeq`                                              | `==` converts types before comparing (`0 == ""` is `true`); `===` doesn't                                                                                                                                                                                      |
| `no-console`                                          | Stray logging stays out of packages and the app. Allowed in `scripts/**`, which are command-line tools                                                                                                                                                         |
| `import-x/order`                                      | Imports are grouped (Node, packages, `@aoc/*`, relative) and sorted, so they're easy to scan and cause fewer merge conflicts                                                                                                                                   |
| `import-x/no-cycle`                                   | Circular imports can leave values `undefined` while modules load                                                                                                                                                                                               |
| `import-x/no-extraneous-dependencies`                 | Every import must be listed in that workspace's `package.json`                                                                                                                                                                                                 |
| `import-x/no-duplicates`                              | One import statement per module                                                                                                                                                                                                                                |
| `import-x/no-default-export`                          | Named exports keep one name everywhere, which makes searching and renaming reliable. Config files are exempt because their tools require a default export                                                                                                      |
| `import-x/no-nodejs-modules` (off in `node`)          | `core` has to run in the browser, a future API and a Discord bot, so Node built-ins are only allowed where Node is guaranteed                                                                                                                                  |
| eslint-plugin-react `recommended` and `jsx-runtime`   | Common React mistakes, such as a missing `key` in a list or `class` instead of `className`. `jsx-runtime` because React no longer needs `import React`                                                                                                         |
| eslint-plugin-react-hooks `recommended`               | `rules-of-hooks` (hooks only at the top level of components) and `exhaustive-deps` (effects list everything they use) are raised to errors. The preset also includes the React Compiler checks                                                                 |
| eslint-plugin-jsx-a11y `recommended`                  | Accessibility: images need alt text, clickable elements need keyboard support, links need a real target                                                                                                                                                        |
| @vitest/eslint-plugin `recommended` (test files only) | Catches `.only` and `.skip` left in, tests without assertions and duplicate test names                                                                                                                                                                         |
| Test relaxations (`*.test.ts(x)` and `e2e/**`)        | Non-null assertions (`!`), empty mock functions and `expect(obj.method)` are normal in tests                                                                                                                                                                   |
| eslint-config-prettier (last in every preset)         | Turns off ESLint's formatting rules, so Prettier alone decides formatting                                                                                                                                                                                      |

`.js` files such as `eslint.config.js` aren't part of any `tsconfig.json`, so they're linted without the type-aware rules.

`eslint-plugin-react` and `eslint-plugin-jsx-a11y` work with ESLint 10 but don't list it in their supported versions yet, so `pnpm-workspace.yaml` allows it. The plugin's automatic React version detection uses an API that ESLint 10 removed, so `react.js` sets the version by hand: update it when React gets a new major or minor version.
