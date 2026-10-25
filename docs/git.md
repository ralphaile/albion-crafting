# Git

## Hooks

`pnpm install` sets up git hooks with [husky](https://typicode.github.io/husky/). The hooks are in `.husky/`.

| Hook         | Runs on      | What it does                                                                                                                                                                                                             |
| ------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pre-commit` | `git commit` | [lint-staged](https://github.com/lint-staged/lint-staged) runs ESLint with `--fix` and then Prettier on staged JavaScript and TypeScript files in `apps/` and `packages/`, and Prettier alone on every other staged file |
| `commit-msg` | `git commit` | [commitlint](https://commitlint.js.org) checks the message. See [Commit messages](#commit-messages)                                                                                                                      |
| `pre-push`   | `git push`   | `turbo run typecheck --affected` type-checks the packages that changed compared to `main`, and the packages that depend on them                                                                                          |

### pre-commit

- Fixes are added to the commit. An ESLint error that can't be fixed stops the commit, and the files stay as they were.
- Only staged changes are checked. Unstaged changes in the same file are set aside and put back afterwards.
- If Prettier undoes every staged change, the commit stops because it would be empty.

### pre-push

- A type error stops the push, and only the failing package's errors are shown.
- It checks the files on disk, so uncommitted changes count too.
- A change to the root `package.json`, the lockfile or `packages/config-typescript` checks every package. A change to docs alone checks none.

### Skipping the hooks

`git commit --no-verify` skips `pre-commit` and `commit-msg` for one commit, and `git push --no-verify` skips `pre-push`. CI still runs every check on the PR.

## Commit messages

Messages follow [Conventional Commits](https://www.conventionalcommits.org):

```text
type(scope): summary
```

- **type** says what kind of change it is (see the table below).
- **scope** is the Jira key, such as `AOC-42`, so the history links back to the ticket. It can be left out: `build: update dependencies`.
- **summary** starts with a lower-case letter and has no full stop at the end. The whole first line is at most 100 characters, and so is every line of the body.

| Type       | Use it for                                     |
| ---------- | ---------------------------------------------- |
| `feat`     | Something new the user can do or see           |
| `fix`      | A bug fix                                      |
| `docs`     | Documentation only                             |
| `test`     | Tests only                                     |
| `refactor` | A code change that doesn't change behavior     |
| `perf`     | A change that makes something faster           |
| `style`    | Formatting only                                |
| `build`    | Dependencies, build setup or packaging         |
| `ci`       | The CI pipeline                                |
| `chore`    | Tooling and upkeep that fits none of the above |
| `revert`   | Undoing an earlier commit                      |

Examples: `feat(AOC-42): add hideout bonus`, `test(AOC-16): add Playwright with a smoke test`.

A message that doesn't fit, such as `fixed stuff`, stops the commit. Merge and revert messages that git writes itself aren't checked. PR titles use the same format, because squash merging turns the title into the commit on `main`.

## Pull requests and CI

Every PR, and every push to `main`, runs `.github/workflows/ci.yml` on GitHub Actions. Its two jobs run side by side:

| Job      | What it runs                                                                                                                                      |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Checks` | `pnpm audit --prod`, then `format:check`, `check:deps`, `check:unused` and `check:versions`, then lint, typecheck and build, then `pnpm coverage` |
| `E2E`    | Installs headless Chromium and runs the E2E tests                                                                                                 |

- On a PR, lint, typecheck, build and E2E only run for the packages that changed compared to `main`, and the packages that depend on them. A change in `.github/workflows` or `.github/actions` runs them all. The other checks and the unit tests always run in full.
- The run's **Summary** page shows the test report and a coverage table per package, next to each minimum.
- When an E2E test fails, its traces, screenshots and videos are attached to the run as `playwright-results-<attempt>` for 14 days.
- A new push to a PR cancels that PR's run if it's still going. Runs on `main` always finish.
- `pnpm audit --prod` never fails the job. When it reports a problem, the PR's checks show a warning. See [Dependency updates and security](#dependency-updates-and-security).

A PR can only be merged when both jobs pass and the branch is up to date with `main`. This rule has no bypass, not even for admins.

The rules for `main` are kept in `.github/rulesets/`: `main.json` for reviews and squash merging, and `require-ci.json` for CI. After changing one, apply it with `gh api -X PUT repos/ralphaile/albion-crafting/rulesets/<id> --input <file>`. `gh api repos/ralphaile/albion-crafting/rulesets` lists the ids.

## Dependency updates and security

[Renovate](https://docs.renovatebot.com) opens update PRs on Mondays (UTC). Its settings are in `.github/renovate.json`.

- Updates are grouped into one PR each for ESLint, types, testing, build tooling, GitHub Actions and Node.js. React gets its own. A major update always gets its own PR.
- A version has to be at least 7 days old, the same rule pnpm follows when installing.
- Renovate's PRs need your approval like any other, and GitHub asks you for a review on each one. Minor and patch updates of dev tools merge by themselves once you approve and CI passes. For the rest, read the release notes in the PR, then approve and merge it yourself.
- When one update merges, the other open ones fall behind `main`. Renovate updates them, which clears your approval, so approve them again.
- The **Dependency Dashboard** issue lists every pending update. Ticking one there opens its PR without waiting for Monday.

Security checks:

| Check                                   | When                                        | What happens                                                                                                                                     |
| --------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm audit --prod`                     | In the `Checks` job                         | Looks up production dependencies in npm's list of known vulnerabilities. A hit is a warning, not a failure                                       |
| CodeQL (`.github/workflows/codeql.yml`) | Every PR, every push to `main`, and Mondays | Scans the code and the workflows for security problems. Findings show on the PR and under **Security → Code scanning**. It doesn't block merging |
| Secret scanning and push protection     | Every push                                  | GitHub rejects a push that contains a recognized secret, such as an API key. If one gets through, revoke it, not just delete it from the code    |
