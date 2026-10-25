# Game data

Recipes, item values, names, locations and crafting bonuses come from [ao-bin-dumps](https://github.com/ao-data/ao-bin-dumps), the game's files converted to JSON. The app uses the commit pinned in `packages/crafting-data/source.json`, so every build uses the same data.

## Updating

| Command                     | What it does                                                               |
| --------------------------- | -------------------------------------------------------------------------- |
| `pnpm data:update`          | Downloads the pinned commit's files, checks them and generates the recipes |
| `pnpm data:update --latest` | Does the same for the newest commit on `master`, then pins that            |

With `--latest`, the pin only moves once the new files pass the checks. Commit the new `source.json` with the regenerated files.

After changing the code that generates a file, run `pnpm data:update` and commit what it regenerates.

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
- `packages/crafting-data/src/generated/` holds what the app imports, built from `raw/` and committed. Each file is a JSON array with one entry per line, sorted, so a patch's diff shows one line per change. Prettier skips the folder, and GitHub collapses it in PR diffs.

## Recipes

`src/generated/recipes.json` has a recipe for every weapon, armor piece and offhand the app covers, at each enchantment level. The app imports it as `recipes` from `@aoc/crafting-data`, and `src/recipe.ts` has its type.

- **Which items:** the shop categories `weapons`, `armors`, `head`, `shoes` and `offhands`, tiers 4 to 8. They come from three lists in `items.json`: `weapon`, `equipmentitem`, and `transformationweapon`, which holds the shapeshifter staffs.
- **Left out:**
  - items the market doesn't show (`@showinmarketplace="false"`)
  - unreleased items, whose IDs end in `_PROTOTYPE`
  - items with no recipe
- **One recipe per enchantment level.** The market ID gets `@` and the level, on the item and on each material: `T5_MAIN_SWORD@1` is made from `T5_METALBAR_LEVEL1@1`.
- **Several recipes for one item:** the first is the default, and the others are kept in `alternatives`.
  - An artifact item's first recipe uses the artifact, and its alternative uses a token such as `T6_ARTEFACT_TOKEN_FAVOR_1`.
  - A royal item is made from a regular SET1, SET2 or SET3 piece plus royal sigils. It has no crafting category and costs no focus.
- **Returned or not:** a material with `@maxreturnamount="0"` is never returned. An item whose default recipe uses an `_ARTEFACT_` material is an artifact item.

## When a check fails

The files were converted from XML, so attribute names start with `@`, numbers are text, and a list with one entry can be a single object. The schemas in `packages/crafting-data/scripts/schemas.ts` handle all three. They only check the fields the app reads and ignore the rest.

A failure lists each problem as `file: path: problem`:

```text
items.json: items.weapon[212].craftingrequirements[0].craftresource[1].@count: expected a number
```

Usually a game patch renamed or removed a field. Find the entry at that path in `raw/`, then update the schema and the code that reads the field. A path can show `[0]` where the file has a single object instead of a list.

The scripts only run in Node. `pnpm check:deps` fails if anything outside `scripts/` imports from it, so none of it reaches the web app.
