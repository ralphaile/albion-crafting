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

`git commit --no-verify` skips `pre-commit` and `commit-msg` for one commit, and `git push --no-verify` skips `pre-push`. `pnpm lint`, `pnpm format:check` and `pnpm typecheck` still have to pass.

## Commit messages

Messages follow [Conventional Commits](https://www.conventionalcommits.org):

```text
type(scope): summary
```

- **type** says what kind of change it is (see the table below).
- **scope** is the Jira key, such as `AOC-42`, so the history links back to the ticket. It can be left out: `chore: update dependencies`.
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
