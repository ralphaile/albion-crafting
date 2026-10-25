import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { download } from "./download.ts";
import { extractRecipes, SHOP_CATEGORIES } from "./recipes.ts";
import { fetchLatestCommit, readSource, writeSource } from "./source.ts";
import { validate } from "./validate.ts";

interface UpdateOptions {
  latest: boolean;
  packageDir: string;
  log: (line: string) => void;
}

export async function update({
  latest,
  packageDir,
  log,
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

  const recipes = extractRecipes(items);
  await writeJsonArray(
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

  if (latest) {
    await writeSource(sourcePath, source);
    log(`Pinned ${commit} in source.json`);
  }
}

async function writeJsonArray(path: string, entries: unknown[]): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(
    path,
    `[\n${entries.map((entry) => JSON.stringify(entry)).join(",\n")}\n]\n`,
  );
}
