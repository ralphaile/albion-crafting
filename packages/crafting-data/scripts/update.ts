import { join } from "node:path";

import { download } from "./download.ts";
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

  if (latest) {
    await writeSource(sourcePath, source);
    log(`Pinned ${commit} in source.json`);
  }
}
