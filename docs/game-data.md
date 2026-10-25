# Game data

Recipes, item values, names, locations and crafting bonuses come from [ao-bin-dumps](https://github.com/ao-data/ao-bin-dumps), the game's files converted to JSON. The app uses the commit pinned in `packages/crafting-data/source.json`, so every build uses the same data.

## Updating

| Command                     | What it does                                                                                                                     |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm data:update`          | Downloads the pinned commit's files, checks them and generates the crafting locations, hideout bonuses, recipes and item names   |
| `pnpm data:update --latest` | Does the same for the newest commit on `master`, then pins that                                                                  |
| `pnpm data:diff`            | Compares the generated files with the committed ones and writes a report of the changes to `packages/crafting-data/data-diff.md` |

With `--latest`, the pin only moves once the new files pass the checks. Commit the new `source.json` with the regenerated files.

After changing the code that generates a file, run `pnpm data:update` and commit what it regenerates.

If `GITHUB_TOKEN` is set, it's sent when asking GitHub for the newest commit. Without it, GitHub allows 60 of those requests an hour.

### After a game patch

1. Run `pnpm data:update --latest`, and read any warnings.
2. Run `pnpm data:diff`, then read `packages/crafting-data/data-diff.md`. It compares the new files with the ones committed at `HEAD`, so run it before committing. It starts with the totals, then lists up to 50 changes: crafting bonuses first, then removed items, added items and changed recipes.
3. Run `pnpm test`.
   - The snapshot tests in `src/snapshot.test.ts` fail where the counts per category, the sample recipes or the crafting locations changed.
   - The tests in `src/index.test.ts` hold values checked in the game. If one fails, check the game before changing the test.
4. Run `pnpm test -u` to accept the new snapshots. Commit `source.json`, the generated files and `src/__snapshots__/` together, and use the report as the PR description.

## Files

| File                     | Used for                                                      |
| ------------------------ | ------------------------------------------------------------- |
| `items.json`             | Recipes, tiers, categories and item values                    |
| `formatted/items.json`   | Item names, in English only                                   |
| `formatted/world.json`   | The names of the cities and Rests, by cluster ID              |
| `craftingmodifiers.json` | Crafting bonuses in cities, Rests and hideouts by map quality |
| `hideouts.json`          | Hideout bonuses by power level                                |

- `packages/crafting-data/raw/` holds the downloads. It's git-ignored, and reused until the pin changes.
- `packages/crafting-data/src/generated/` holds what the app imports, built from `raw/` and committed. Each file has one entry per line, so a patch's diff shows one line per change: a JSON array, or for the hideout bonuses an object of arrays. Recipes and names are sorted by ID, crafting locations and biomes keep the game file's order, and map qualities and power levels go from lowest to highest. Prettier skips the folder, and GitHub collapses it in PR diffs.

## Recipes

`src/generated/recipes.json` has a recipe for every weapon, armor piece and offhand the app covers, at each enchantment level. The app imports it as `recipes` from `@aoc/crafting-data`, and `src/recipe.ts` has its type.

- **Which items:** the shop categories `weapons`, `armors`, `head`, `shoes` and `offhands`, tiers 4 to 8. They come from three lists in `items.json`: `weapon`, `equipmentitem`, and `transformationweapon`, which holds the shapeshifter staffs. If any other list holds gear, `pnpm data:update` prints a warning that names it, because the shapeshifter staffs arrived that way.
- **Left out:**
  - items the market doesn't show (`@showinmarketplace="false"`)
  - unreleased items, whose IDs end in `_PROTOTYPE`
  - items with no recipe
- **One recipe per enchantment level.** The market ID gets `@` and the level, on the item and on each material: `T5_MAIN_SWORD@1` is made from `T5_METALBAR_LEVEL1@1`.
- **Several recipes for one item:** the first is the default, and the others are kept in `alternatives`.
  - An artifact item's first recipe uses the artifact, and its alternative uses a token such as `T6_ARTEFACT_TOKEN_FAVOR_1`.
  - A royal item is made from a regular SET1, SET2 or SET3 piece plus royal sigils. It has no crafting category and costs no focus.
- **Returned or not:** a material with `@maxreturnamount="0"` is never returned. An item whose default recipe uses an `_ARTEFACT_` material is an artifact item.
- **Item value:** `itemValue`, which the station fee is based on, is Σ(count × the material's `@itemvalue`) ÷ the amount crafted, from the default recipe. Refined materials are worth 16 at T4 and double with each tier and enchantment level, so Adept's Broadsword (`T4_MAIN_SWORD`) is 16 × 16 + 8 × 16 = 384.
  - A royal item's base piece has no `@itemvalue`, so it takes the item value of its own recipe.
  - An artifact counts too: the Master's Clarent Blade is 16 × 64 + 8 × 64 + 384 for its artifact = 1,920.
  - If a material has no `@itemvalue`, `pnpm data:update` prints a warning and the recipe has no `itemValue`, rather than counting the material as 0. The shapeshifter staffs are like this, because their `ALCHEMY_RARE` materials have no value.

## Names, icons and search

`src/generated/items.json` names every crafted item and every material its recipes use, and marks the crafted ones `"crafted": true`. The search covers only those, and builds its index when the app loads. The app uses them through `itemName`, `iconUrl` and `searchItems` from `@aoc/crafting-data`.

- **Names** are the `EN-US` names from `formatted/items.json`, keyed by `UniqueName`, which includes the enchanted IDs such as `T5_MAIN_SWORD@1`. The other languages are left out, because some of them have encoding problems.
- **Tier and enchantment** are added to the name: `T5_MAIN_SWORD@1` is "Expert's Broadsword 5.1", and `T5_MAIN_SWORD` is "Expert's Broadsword 5.0". An ID that doesn't start with a tier, such as `QUESTITEM_TOKEN_ROYAL_T4` ("Adept's Royal Sigil"), keeps its name as it is.
- **A missing name:** `pnpm data:update` prints a warning, and the app shows the item's ID instead.
- **Icons** come from the game's render service: `iconUrl("T5_MAIN_SWORD@1")` is `https://render.albiononline.com/v1/item/T5_MAIN_SWORD@1.png?quality=1&size=64`. The app lazy-loads them. The service draws icons on demand and sometimes answers 502 while it's busy, so when one fails to load the app shows a grey placeholder, tries again after 1 second and after 3 more, then keeps the placeholder.
- **Search:** each entry holds the item's name and ID in lowercase, without apostrophes, such as `experts broadsword 5.1 t5_main_sword@1`. A query matches when each of its words appears somewhere in the entry, in any order, so `broad 5.1` and `experts broadsword` both find the Expert's Broadsword.

## Crafting locations

`src/generated/locations.json` has the crafting bonuses of the 7 cities, the 3 Rests and the island. The app imports it as `craftingLocations` from `@aoc/crafting-data`, and `src/location.ts` has its type.

- **Which locations:** the entries in `craftingmodifiers.json` with a cluster ID and a `craftingbonus`. The `id` is the cluster ID, and the `name` comes from `formatted/world.json`: `4300` is "Arthur's Rest". A cluster with no name prints a warning and keeps its ID as its name.
- **Left out:** the 100 `TNL-…` clusters, Roads of Avalon zones such as Quatun-Nusas, which have no crafting bonus. The hideout entries, by biome and map quality, go into [Hideouts](#hideouts).
- **`craftingBonus`** is the base bonus, 0.18 in every city and Rest.
- **`specialties`** maps a crafting category to its bonus, such as `{ "sword": 0.15 }`, so a recipe's specialty bonus is `specialties[recipe.craftingCategory] ?? 0`.
  - The refining bonuses, such as `ore` 0.40, are left out. The file lists their categories in `refiningcategory`.
  - The royal cities' butcher bonuses, such as `meat_pig` 0.10, are kept for food crafting later.
- **The island** has no specialties, and its bonus is the `@islandvalue` that every city and Rest gives, 0. If they ever disagree, `pnpm data:update` fails before writing anything.
- **A test** checks that every recipe's crafting category is some location's specialty, so a category the game renames on one side shows up.

## Hideouts

`src/generated/hideouts.json` has the bonuses for crafting in a Black Zone hideout, as three small tables. The app imports it as `hideouts` from `@aoc/crafting-data`, and `src/hideout.ts` has its type.

- **`biomes`:** Swamp, Forest, Steppe, Highland and Mountain, each with its 5 crafting categories and `cityId`, the cluster ID of its royal city. A biome's categories are exactly that city's gear specialties.
  - The game files don't link a biome to its city, so `scripts/hideouts.ts` has that table: Swamp is Thetford, Forest Lymhurst, Steppe Bridgewatch, Highland Martlock and Mountain Fort Sterling.
  - A test checks that each biome's categories still match its city's.
- **`mapQualities`:** what the map quality, Q1 to Q6, adds for the biome's 5 categories: 0.01 to 0.26.
- **`powerLevels`:** levels 1 to 9, from `hideouts.json`. The general bonus counts for everything crafted there, and the specialist bonus only for the biome's 5 categories. The file leaves both out at level 1, which means 0.
- **`refiningBonus`:** 0.15 in every hideout, kept for refining later.
- **Why tables:** `craftingmodifiers.json` has 30 hideout entries, one per biome and map quality, with the same numbers in every biome. If one ever differs, such as a single biome getting another bonus at Q3, `pnpm data:update` fails before writing anything and names the difference.
- **Left out:** Roads of Avalon hideouts, which come in a later release.

A hideout's production bonus for a crafting category:

```text
B = general bonus + (the biome's category ? map quality bonus + specialist bonus : 0) + daily bonus + 0.59 with focus
```

So a level 9 hideout on a Q6 map gives 0.26 + 0.26 + 0.30 = 0.82 for its biome's categories, and 0.26 for the rest.

## When a check fails

The files were converted from XML, so attribute names start with `@`, numbers are text, and a list with one entry can be a single object. The schemas in `packages/crafting-data/scripts/schemas.ts` handle all three. They only check the fields the app reads and ignore the rest.

A failure lists each problem as `file: path: problem`:

```text
items.json: items.weapon[212].craftingrequirements[0].craftresource[1].@count: expected a number
```

Usually a game patch renamed or removed a field. Find the entry at that path in `raw/`, then update the schema and the code that reads the field. A path can show `[0]` where the file has a single object instead of a list.

The scripts only run in Node. `pnpm check:deps` fails if anything outside `scripts/` imports from it, so none of it reaches the web app.
