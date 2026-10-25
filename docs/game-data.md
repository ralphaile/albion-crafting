# Game data

Recipes, item values, names, locations and crafting bonuses come from [ao-bin-dumps](https://github.com/ao-data/ao-bin-dumps), the game's files converted to JSON. The app uses the commit pinned in `packages/crafting-data/source.json`, so every build uses the same data.

## Updating

| Command                     | What it does                                                    |
| --------------------------- | --------------------------------------------------------------- |
| `pnpm data:update`          | Downloads the pinned commit's files and checks them             |
| `pnpm data:update --latest` | Does the same for the newest commit on `master`, then pins that |

With `--latest`, the pin only moves once the new files pass the checks. Commit the new `source.json` with the changes the update brings.

If `GITHUB_TOKEN` is set, it's sent when asking GitHub for the newest commit. Without it, GitHub allows 60 of those requests an hour.

## Files

| File                     | Used for                                                      |
| ------------------------ | ------------------------------------------------------------- |
| `items.json`             | Recipes, tiers, categories and item values                    |
| `formatted/items.json`   | Item names                                                    |
| `formatted/world.json`   | Cluster IDs, which identify the cities                        |
| `craftingmodifiers.json` | Crafting bonuses in cities, Rests and hideouts by map quality |
| `hideouts.json`          | Hideout bonuses by power level                                |

- `packages/crafting-data/raw/` holds the downloads. It's git-ignored, and reused until the pin changes.
- `packages/crafting-data/generated/` will hold what the app imports, built from `raw/` and committed. The recipe extraction writes its first file.

## When a check fails

The files were converted from XML, so attribute names start with `@`, numbers are text, and a list with one entry can be a single object. The schemas in `packages/crafting-data/scripts/schemas.ts` handle all three. They only check the fields the app reads and ignore the rest.

A failure lists each problem as `file: path: problem`:

```text
items.json: items.weapon[212].craftingrequirements[0].craftresource[1].@count: expected a number
```

Usually a game patch renamed or removed a field. Find the entry at that path in `raw/`, then update the schema and the code that reads the field. A path can show `[0]` where the file has a single object instead of a list.

The scripts only run in Node. `pnpm check:deps` fails if anything outside `scripts/` imports from it, so none of it reaches the web app.
