# Testing

## Which kind of test

| Kind      | Tool                                    | Use it for                                                                                                  | Where                                       |
| --------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Unit      | Vitest                                  | One function or module: calculations in `core`, the AODP client in `market-prices`, data in `crafting-data` | Next to the code: `src/return-rate.test.ts` |
| Component | Vitest, React Testing Library and jsdom | One component or screen of `apps/web`: what the user sees and what happens when they click or type          | Next to the component: `src/App.test.tsx`   |
| E2E       | Playwright and Chromium                 | A few key journeys through the built app in a real browser, with AODP responses faked                       | `apps/web/e2e/`                             |

- Logic belongs in the packages, where unit tests are fast and simple. Components stay thin.
- Test at the lowest level that can catch the bug. E2E tests are slow, so keep them for whole journeys.
- Component tests find elements the way a user does: by role, label or visible text, such as `screen.getByRole("heading", { name: "Albion Crafting" })`. Not by CSS class or component internals.
- No test calls a real server. See [HTTP and fixtures](#http-and-fixtures).

## Running tests

| Command                         | What it does                                               |
| ------------------------------- | ---------------------------------------------------------- |
| `pnpm test`                     | Runs every unit and component test once                    |
| `pnpm test:watch`               | Reruns the affected tests when files change                |
| `pnpm test --project @aoc/core` | Runs one workspace's tests                                 |
| `pnpm test return-rate`         | Runs the test files whose path contains `return-rate`      |
| `pnpm coverage`                 | Runs the tests and fails if a package is below its minimum |
| `pnpm e2e`                      | Builds the web app and runs the E2E tests                  |
| `pnpm e2e -- smoke`             | Runs the E2E files whose name contains `smoke`             |
| `pnpm e2e -- --headed`          | Runs the E2E tests in a visible browser window             |

Each workspace under `apps/` and `packages/` is a Vitest project named after its `package.json`. A new workspace is picked up automatically.

The E2E tests need Chromium, downloaded once with `pnpm --filter @aoc/web exec playwright install chromium`.

## Naming

- Test files are named after what they test: `return-rate.test.ts` for `return-rate.ts`, `App.test.tsx` for `App.tsx`.
- `describe` names the function or component. Each `it` finishes the sentence with the expected behavior: `returnRate` › "rises as the production bonus rises".
- Setup files and fixtures live in the workspace's `test/` folder, not in `src/`.

## Golden tests for calculations

A golden test checks a result against a value known to be right, from the game or from research, instead of one worked out with the formula being tested. Every calculation in `core` gets them. Example: `packages/core/src/return-rate.test.ts`.

- Use a table (`it.each`) with one row per case, and name the case in the row, such as "royal city specialty with focus". A failure then says which case broke.
- Compare at the precision of the source. The return rates are published as percentages with two decimals, so the test compares `"47.92%"`, not a long float.
- Never change a golden value just to make a test pass. When one fails, find out whether the code or the value is wrong.

## Property tests

A property test states a rule that must hold for every input, and fast-check tries 100 random inputs on each run. Use them for rules such as "never negative" or "rises as the input rises". Example: the `returnRate` tests.

- Limit the generated values to the real range, such as `fc.double({ min: 0, max: 10, noNaN: true })` for a production bonus. Outside it, floating-point rounding makes rules fail that don't matter in the game.
- Each run uses new random values. When one fails, fast-check prints the seed and the smallest input that fails:

  ```text
  Property failed after 3 tests
  { seed: -1099620958, path: "2:8:0:1", endOnFailure: true }
  Counterexample: [0.09901951359278492,9.999999999999991]
  ```

  To rerun exactly that case, pass the seed and path as the last argument: `fc.assert(property, { seed: -1099620958, path: "2:8:0:1" })`. Remove them again before you commit.

## HTTP and fixtures

Tests in `market-prices` run with [MSW](https://mswjs.io), which catches every HTTP request. A request that no test set up a response for fails with `[MSW] Error: intercepted a request without a matching request handler`. Any other workspace that starts making HTTP requests gets the same setup.

Add a response for one test with `server.use`. It's removed again after the test:

```ts
import { http, HttpResponse } from "msw/http";

import prices from "./fixtures/prices.json" with { type: "json" };
import { server } from "./setup.js";

server.use(
  http.get(
    "https://west.albion-online-data.com/api/v2/stats/prices/:itemIds",
    () => HttpResponse.json(prices.body),
  ),
);
```

`test/setup.ts` fails unhandled requests itself instead of using MSW's `onUnhandledFrame: "error"` option, because that option lets URLs ending in `.json` through to the real server, and every AODP URL ends in `.json`. `test/network.test.ts` fails if this ever breaks.

`packages/market-prices/test/fixtures` holds AODP responses: prices, history, a response with no data (`0` and `0001-01-01T00:00:00`) and a 429. Each file is a whole response: `request`, `source`, `status`, `headers` and `body`. To add one, request it once by hand with compression on (Node's `fetch` does this; plain `curl` doesn't, and AODP limits uncompressed requests to one every 5 minutes), save the body unchanged and keep only the `content-type` header. The E2E tests answer requests from the same files.

## E2E tests

`pnpm e2e` builds the web app, starts it with `vite preview` on port 4173 and runs every `apps/web/e2e/*.spec.ts` file in headless Chromium. Every UI story adds or updates the scenarios for its journey.

### Adding a scenario

Give each journey its own file, such as `e2e/smoke.spec.ts`. Import `test` and `expect` from `./test`, not from `@playwright/test`:

```ts
import { expect, test } from "./test";

test("the app loads and shows its title", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Albion Crafting");
  await expect(
    page.getByRole("heading", { name: "Albion Crafting" }),
  ).toBeVisible();
});
```

The `test` from `./test` adds two things to every test:

- **A fake network.** Requests to anywhere other than the app are answered from the recorded responses in `packages/market-prices/test/fixtures`: `prices.json`, `history.json` and `prices-no-data.json`. A request with no recording is blocked and fails the test with `GET <url> has no recorded response`.
- **An error check.** The test fails if the browser console shows an error or the page throws one.

Find elements by role, label or visible text, as in component tests.

### Other responses

To answer a request differently in one test, pass recorded responses to `respondWith` before `page.goto`. Each one replaces the default for the same request, and the other defaults stay:

```ts
import rateLimited from "@aoc/market-prices/fixtures/rate-limited.json" with { type: "json" };

import { respondWith } from "./test";

await respondWith(page, rateLimited);
await page.goto("/");
```

A recording answers a request when its `request` field, the method and URL, is exactly the request the app sends. To record a new response, see [HTTP and fixtures](#http-and-fixtures).

A test that expects an error removes it from `problems`, so the final check passes. The browser logs a failed response, such as the 429, as a console error:

```ts
expect(problems.splice(0)).toEqual([
  "Failed to load resource: the server responded with a status of 429 (Too Many Requests)",
]);
```

### Never the real AODP

Besides blocking requests, Chromium starts with `--host-resolver-rules`, so it can't look up any hostname except `localhost`. If the routing ever breaks, requests fail instead of reaching the real API. `e2e/network.spec.ts` checks the blocking, the default responses and `respondWith`.

### When a test fails

Playwright keeps a screenshot, a video and a trace of each failed test in `apps/web/test-results/`. A trace records every step, with the page, console and network at that moment. Open one with:

```sh
pnpm --filter @aoc/web exec playwright show-trace test-results/<test>/trace.zip
```

`test.only` is refused when `CI` is set, so a focused test can't silently skip the rest in CI.

## Coverage

`pnpm coverage` fails when a package is below its minimum for lines or branches:

| Package                          | Minimum |
| -------------------------------- | ------- |
| `core`                           | 90%     |
| `market-prices`, `crafting-data` | 80%     |
| `web`                            | 60%     |

Files that no test loads count as 0%. `apps/web/src/main.tsx` only starts the app, so it's left out and the E2E tests cover it. The full report is in `coverage/index.html`.
