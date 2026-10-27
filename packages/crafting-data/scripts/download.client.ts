import { createWriteStream } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import { FILES } from "./download.constants.ts";
import type { Source } from "./source.schema.ts";

const COMMIT_MARKER = "commit.txt";

export async function download(
  source: Source,
  dir: string,
): Promise<"downloaded" | "reused"> {
  const marker = join(dir, COMMIT_MARKER);
  const downloadedCommit = await readFile(marker, "utf8").catch(
    () => undefined,
  );
  if (downloadedCommit === source.commit) {
    return "reused";
  }

  await rm(dir, { recursive: true, force: true });
  for (const file of FILES) {
    const url = `https://raw.githubusercontent.com/${source.repository}/${source.commit}/${file}`;
    const response = await fetch(url);
    if (!response.ok || !response.body) {
      throw new Error(
        `Downloading ${file} failed: HTTP ${String(response.status)} from ${url}`,
      );
    }
    const target = join(dir, file);
    await mkdir(dirname(target), { recursive: true });
    await pipeline(Readable.fromWeb(response.body), createWriteStream(target));
  }
  await writeFile(marker, source.commit);
  return "downloaded";
}
