import { copyFile, mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { iconUrl } from "@aoc/crafting-data";

import { shownItemIds } from "./item-ids.ts";

// The render service draws icons on demand and turns away bursts, so a few at
// a time, each tried again after a pause.
const AT_ONCE = 4;
const RETRY_DELAYS_MS = [1000, 3000, 9000];

const wait = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

async function download(itemId: string): Promise<Uint8Array | undefined> {
  for (const delay of [0, ...RETRY_DELAYS_MS]) {
    await wait(delay);
    try {
      const response = await fetch(iconUrl(itemId));
      if (response.ok) {
        return new Uint8Array(await response.arrayBuffer());
      }
    } catch {
      // Tried again below.
    }
  }
  return undefined;
}

try {
  const { values } = parseArgs({
    options: {
      out: { type: "string", default: "dist/icons" },
      cache: { type: "string", default: ".icons" },
    },
  });
  await mkdir(values.out, { recursive: true });
  await mkdir(values.cache, { recursive: true });
  const cached = new Set(await readdir(values.cache));
  const itemIds = shownItemIds();
  const missing = itemIds.filter((itemId) => !cached.has(`${itemId}.png`));
  console.log(
    `${String(itemIds.length)} icons, ${String(missing.length)} to download`,
  );

  const failed: string[] = [];
  const queue = [...missing];
  await Promise.all(
    Array.from({ length: AT_ONCE }, async () => {
      for (let itemId = queue.shift(); itemId; itemId = queue.shift()) {
        const icon = await download(itemId);
        if (icon === undefined) {
          failed.push(itemId);
        } else {
          await writeFile(join(values.cache, `${itemId}.png`), icon);
        }
      }
    }),
  );

  let bytes = 0;
  for (const itemId of itemIds) {
    const file = `${itemId}.png`;
    if (!failed.includes(itemId)) {
      await copyFile(join(values.cache, file), join(values.out, file));
      bytes += (await stat(join(values.out, file))).size;
    }
  }
  console.log(
    `${String(itemIds.length - failed.length)} icons, ${(bytes / 1e6).toFixed(1)} MB`,
  );
  if (failed.length > 0) {
    // GitHub Actions shows this line as a warning on the run.
    console.log(
      `::warning title=Item icons::The render service didn't answer for ${String(failed.length)} icons, so the site loads those from it instead`,
    );
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
