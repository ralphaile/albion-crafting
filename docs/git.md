# Git

## Hooks

`pnpm install` sets up git hooks with [husky](https://typicode.github.io/husky/). The hooks are in `.husky/`.

| Hook         | Runs on      | What it does                                                                                                                                                                                                             |
| ------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pre-commit` | `git commit` | [lint-staged](https://github.com/lint-staged/lint-staged) runs ESLint with `--fix` and then Prettier on staged JavaScript and TypeScript files in `apps/` and `packages/`, and Prettier alone on every other staged file |

- Fixes are added to the commit. An ESLint error that can't be fixed stops the commit, and the files stay as they were.
- Only staged changes are checked. Unstaged changes in the same file are set aside and put back afterwards.
- If Prettier undoes every staged change, the commit stops because it would be empty.
- `git commit --no-verify` skips the hooks for one commit. `pnpm lint` and `pnpm format:check` still have to pass.
