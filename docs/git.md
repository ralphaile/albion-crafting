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

## Branches

Each ticket gets its own branch off an up-to-date `main`, named after the ticket:

- `feature/AOC-<n>-<slug>` for new work, such as `feature/AOC-20-deploy-to-github-pages`
- `fix/AOC-<n>-<slug>` for a bug fix

The slug is a few lower-case words joined by hyphens. GitHub deletes the branch once its PR is merged.

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

A change gets from its branch to `main` like this:

1. **Commit** on the branch. The hooks check each commit, and `pre-push` type-checks before anything leaves your machine.
2. **Open a PR.** The template asks for a summary, the Jira key, testing notes and the [Definition of Done](#definition-of-done). The PR title follows the [commit message format](#commit-messages), because it becomes the commit on `main`.
3. **CI runs**, as described below. `main` also needs an approving review. As the admin, you can merge your own PR without one, but never without CI.
4. **Squash-merge.** The PR becomes one commit on `main`, titled after the PR, and `Deploy` publishes it.
5. **Move the ticket to Done** in Jira.

Every PR, and every push to `main`, runs `.github/workflows/ci.yml` on GitHub Actions. `Checks` and `E2E` run side by side. On `main`, `Deploy` follows once both pass:

| Job      | What it runs                                                                                                                                      |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Checks` | `pnpm audit --prod`, then `format:check`, `check:deps`, `check:unused` and `check:versions`, then lint, typecheck and build, then `pnpm coverage` |
| `E2E`    | Installs headless Chromium and runs the E2E tests                                                                                                 |
| `Deploy` | Publishes the site to GitHub Pages. See [Deployment](#deployment)                                                                                 |

- On a PR, lint, typecheck, build and E2E only run for the packages that changed compared to `main`, and the packages that depend on them. A change in `.github/workflows` or `.github/actions` runs them all. The other checks and the unit tests always run in full.
- The run's **Summary** page shows the test report and a coverage table per package, next to each minimum.
- When an E2E test fails, its traces, screenshots and videos are attached to the run as `playwright-results-<attempt>` for 14 days.
- A new push to a PR cancels that PR's run if it's still going. On `main`, a run that has started always finishes. If more pushes arrive meanwhile, only the newest one waits to run next.
- `pnpm audit --prod` never fails the job. When it reports a problem, the PR's checks show a warning. See [Dependency updates and security](#dependency-updates-and-security).

A PR can only be merged when `Checks` and `E2E` pass and the branch is up to date with `main`. This rule has no bypass, not even for admins.

The rules for `main` are kept in `.github/rulesets/`: `main.json` for reviews and squash merging, and `require-ci.json` for CI. After changing one, apply it with `gh api -X PUT repos/ralphaile/albion-crafting/rulesets/<id> --input <file>`. `gh api repos/ralphaile/albion-crafting/rulesets` lists the ids.

## Definition of Done

A ticket is done when its PR is merged with every box at the bottom of the PR description ticked. The boxes come from `.github/pull_request_template.md`:

- The PR title is a Conventional Commit with the Jira key, and the branch is named after the ticket.
- Every acceptance criterion on the ticket is met, or the PR explains the gap.
- Tests are added or updated: unit tests for logic, component or E2E tests for UI.
- CI is green: lint with 0 warnings, typecheck, tests with coverage, build and E2E.
- Docs and [ADRs](adr/README.md) are updated where commands, behavior or conventions changed.
- The diff has no secrets, tokens or personal data.

A box that doesn't apply stays unticked, with the reason next to it, such as "(N/A: docs only)".

## Deployment

The site is at https://ralphaile.github.io/albion-crafting/.

- Every push to `main` deploys it once `Checks` and `E2E` pass. `Checks` packs `apps/web/dist`, and `Deploy` publishes it.
- When anything fails, nothing is deployed and the previous version stays live.
- Only `main` can deploy. The `github-pages` environment (**Settings → Environments**) refuses every other branch.
- To undo a bad release, revert its commit through a PR. The deploy that follows puts the old version back.

The app lives under `/albion-crafting/`, locally too: `pnpm dev` serves it at `http://localhost:5173/albion-crafting/`. If the repo is renamed or gets its own domain, change `base` in `apps/web/vite.config.ts` and `appURL` in `apps/web/playwright.config.ts`.

GitHub Pages answers every unknown path with `404.html`, which the build makes as a copy of `index.html`. So a link to a page inside the app, or a refresh, still loads the app. Those pages come back with HTTP status 404, which only search engines notice.

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
