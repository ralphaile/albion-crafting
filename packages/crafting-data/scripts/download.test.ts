import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { download, FILES } from "./download.ts";
import type { Source } from "./source.ts";
import { server } from "../test/setup.ts";

const source: Source = {
  repository: "ao-data/ao-bin-dumps",
  commit: "1a469e53de028c5f85cdd80505f10cbd0a2515cf",
  committedAt: "2026-10-12T11:25:12Z",
};

const rawFiles =
  "https://raw.githubusercontent.com/ao-data/ao-bin-dumps/:commit/*";

function serveFiles(): string[] {
  const requested: string[] = [];
  server.use(
    http.get(rawFiles, ({ request }) => {
      const path = new URL(request.url).pathname;
      requested.push(path);
      return HttpResponse.text(`contents of ${path}`);
    }),
  );
  return requested;
}

let tmp: string;
let dir: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), "aoc-download-"));
  dir = join(tmp, "raw");
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe("download", () => {
  it("downloads the five files at the pinned commit", async () => {
    const requested = serveFiles();

    await expect(download(source, dir)).resolves.toBe("downloaded");

    const paths = FILES.map(
      (file) => `/ao-data/ao-bin-dumps/${source.commit}/${file}`,
    );
    expect(requested).toEqual(paths);
    for (const [index, file] of FILES.entries()) {
      expect(await readFile(join(dir, file), "utf8")).toBe(
        `contents of ${String(paths[index])}`,
      );
    }
    expect(await readFile(join(dir, "commit.txt"), "utf8")).toBe(source.commit);
  });

  it("reuses the files when they're from the same commit", async () => {
    const requested = serveFiles();
    await download(source, dir);

    await expect(download(source, dir)).resolves.toBe("reused");

    expect(requested).toHaveLength(FILES.length);
  });

  it("deletes files from another commit before downloading", async () => {
    serveFiles();
    await mkdir(dir);
    await writeFile(join(dir, "commit.txt"), "0".repeat(40));
    await writeFile(join(dir, "stale.json"), "{}");

    await expect(download(source, dir)).resolves.toBe("downloaded");

    expect(existsSync(join(dir, "stale.json"))).toBe(false);
  });

  it("names the file that failed and doesn't mark the commit as downloaded", async () => {
    server.use(
      http.get(rawFiles, ({ request }) =>
        request.url.endsWith("/hideouts.json")
          ? new HttpResponse(null, { status: 404 })
          : HttpResponse.text("{}"),
      ),
    );

    await expect(download(source, dir)).rejects.toThrow(
      "Downloading hideouts.json failed: HTTP 404",
    );
    expect(existsSync(join(dir, "commit.txt"))).toBe(false);
  });
});
