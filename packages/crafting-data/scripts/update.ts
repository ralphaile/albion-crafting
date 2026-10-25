import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { download } from "./download.ts";
import { extractHideouts } from "./hideouts.ts";
import { addItemValues } from "./item-value.ts";
import { extractItems } from "./items.ts";
import { extractLocations } from "./locations.ts";
import { extractRecipes, findUnreadGear, SHOP_CATEGORIES } from "./recipes.ts";
import { fetchLatestCommit, readSource, writeSource } from "./source.ts";
import { validate } from "./validate.ts";

interface UpdateOptions {
  latest: boolean;
  packageDir: string;
  log: (line: string) => void;
  warn: (line: string) => void;
}

export async function update({
  latest,
  packageDir,
  log,
  warn,
}: UpdateOptions): Promise<void> {
  const sourcePath = join(packageDir, "source.json");
  const rawDir = join(packageDir, "raw");

  const source = latest
    ? await fetchLatestCommit()
    : await readSource(sourcePath);
  const commit = source.commit.slice(0, 10);
  log(`${source.repository} at ${commit}, committed ${source.committedAt}`);

  const downloaded = await download(source, rawDir);
  log(
    downloaded === "reused"
      ? "Reused the files already in raw/"
      : "Downloaded the files to raw/",
  );

  const dumps = await validate(rawDir);
  const { items } = dumps["items.json"];
  const count = (n: number, what: string) =>
    `${n.toLocaleString("en-US")} ${what}`;
  log(
    `Valid: ${[
      count(items.weapon.length, "weapons"),
      count(items.transformationweapon.length, "shapeshifter staffs"),
      count(items.equipmentitem.length, "equipment items"),
      count(items.simpleitem.length, "simple items"),
      count(dumps["formatted/items.json"].length, "names"),
      count(dumps["formatted/world.json"].length, "clusters"),
      count(
        dumps["craftingmodifiers.json"].craftingmodifiers.craftinglocation
          .length,
        "crafting locations",
      ),
      count(
        dumps["hideouts.json"].hideouts.hideout.powerlevels.powerlevel.length,
        "power levels",
      ),
    ].join(", ")}`,
  );

  const located = extractLocations(
    dumps["craftingmodifiers.json"].craftingmodifiers,
    dumps["formatted/world.json"],
  );
  const hideouts = extractHideouts(
    dumps["craftingmodifiers.json"].craftingmodifiers,
    dumps["hideouts.json"].hideouts.hideout.powerlevels.powerlevel,
    located.locations,
  );
  for (const warning of located.warnings) {
    warn(`Warning: ${warning}`);
  }
  await writeJson(
    join(packageDir, "src", "generated", "locations.json"),
    located.locations,
  );
  log(
    `Extracted ${count(located.locations.length, "crafting locations")}: ${located.locations
      .map(({ name }) => name)
      .join(", ")}`,
  );
  await writeJson(
    join(packageDir, "src", "generated", "hideouts.json"),
    hideouts,
  );
  const biomeNames = hideouts.biomes.map(({ name }) => name).join(", ");
  log(
    `Extracted the hideout bonuses for ${count(hideouts.biomes.length, "biomes")} (${biomeNames}), ${count(hideouts.mapQualities.length, "map qualities")} and ${count(hideouts.powerLevels.length, "power levels")}`,
  );

  const { recipes, warnings } = addItemValues(
    extractRecipes(items),
    items.simpleitem,
  );
  for (const warning of [...findUnreadGear(items), ...warnings]) {
    warn(`Warning: ${warning}`);
  }
  await writeJson(
    join(packageDir, "src", "generated", "recipes.json"),
    recipes,
  );
  const itemsByCategory = new Map(
    [...SHOP_CATEGORIES].map((category) => [category, new Set<string>()]),
  );
  for (const recipe of recipes) {
    itemsByCategory.get(recipe.shopCategory)?.add(recipe.baseId);
  }
  const itemTotal = [...itemsByCategory.values()].reduce(
    (total, baseIds) => total + baseIds.size,
    0,
  );
  log(
    `Extracted ${count(recipes.length, "recipes")} for ${count(itemTotal, "items")}: ${[
      ...itemsByCategory,
    ]
      .map(([category, baseIds]) => count(baseIds.size, category))
      .join(", ")}`,
  );

  const named = extractItems(recipes, dumps["formatted/items.json"]);
  for (const warning of named.warnings) {
    warn(`Warning: ${warning}`);
  }
  await writeJson(
    join(packageDir, "src", "generated", "items.json"),
    named.items,
  );
  const crafted = named.items.filter((item) => item.crafted).length;
  log(
    `Named ${count(named.items.length, "item IDs")}: ${count(crafted, "crafted")}, which the search covers, and ${count(named.items.length - crafted, "materials")}`,
  );

  if (latest) {
    await writeSource(sourcePath, source);
    log(`Pinned ${commit} in source.json`);
  }
}

async function writeJson(path: string, data: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${oneRowPerLine(data)}\n`);
}

function oneRowPerLine(data: unknown): string {
  if (Array.isArray(data)) {
    return `[\n${data.map((entry) => JSON.stringify(entry)).join(",\n")}\n]`;
  }
  if (typeof data === "object" && data !== null) {
    return `{\n${Object.entries(data)
      .map(([key, value]) => `${JSON.stringify(key)}: ${oneRowPerLine(value)}`)
      .join(",\n")}\n}`;
  }
  return JSON.stringify(data);
}
