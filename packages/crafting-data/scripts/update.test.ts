import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { readSource, type Source, writeSource } from "./source.ts";
import { update } from "./update.ts";
import { server } from "../test/setup.ts";

const fixtures = fileURLToPath(
  new URL("../test/fixtures/dumps", import.meta.url),
);

const pinned: Source = {
  repository: "ao-data/ao-bin-dumps",
  commit: "1a469e53de028c5f85cdd80505f10cbd0a2515cf",
  committedAt: "2026-10-12T11:25:12Z",
};

const newest: Source = {
  repository: "ao-data/ao-bin-dumps",
  commit: "2b57af64ef139d6f96dee91616f20dce1b1626d0",
  committedAt: "2026-10-19T09:00:00Z",
};

function serveDumps(broken?: string) {
  server.use(
    http.get(
      "https://api.github.com/repos/ao-data/ao-bin-dumps/commits/master",
      () =>
        HttpResponse.json({
          sha: newest.commit,
          commit: { committer: { date: newest.committedAt } },
        }),
    ),
    http.get(
      "https://raw.githubusercontent.com/ao-data/ao-bin-dumps/:commit/*",
      async ({ request }) => {
        const file = new URL(request.url).pathname
          .split("/")
          .slice(4)
          .join("/");
        return HttpResponse.text(
          file === broken ? "[]" : await readFile(join(fixtures, file), "utf8"),
        );
      },
    ),
  );
}

let packageDir: string;
let lines: string[];

function run(latest: boolean) {
  return update({ latest, packageDir, log: (line) => lines.push(line) });
}

beforeEach(async () => {
  packageDir = await mkdtemp(join(tmpdir(), "aoc-update-"));
  lines = [];
});

afterEach(async () => {
  await rm(packageDir, { recursive: true, force: true });
});

describe("update", () => {
  it("downloads and validates the pinned commit", async () => {
    serveDumps();
    await writeSource(join(packageDir, "source.json"), pinned);

    await run(false);

    expect(lines).toEqual([
      "ao-data/ao-bin-dumps at 1a469e53de, committed 2026-10-12T11:25:12Z",
      "Downloaded the files to raw/",
      "Valid: 3 weapons, 1 shapeshifter staffs, 2 equipment items, 5 simple items, 5 names, 3 clusters, 4 crafting locations, 3 power levels",
    ]);
    expect(existsSync(join(packageDir, "raw", "hideouts.json"))).toBe(true);
    await expect(readSource(join(packageDir, "source.json"))).resolves.toEqual(
      pinned,
    );
  });

  it("with --latest, pins the newest commit once its files are valid", async () => {
    serveDumps();
    await writeSource(join(packageDir, "source.json"), pinned);

    await run(true);

    expect(lines.at(-1)).toBe("Pinned 2b57af64ef in source.json");
    await expect(readSource(join(packageDir, "source.json"))).resolves.toEqual(
      newest,
    );
  });

  it("with --latest, keeps the old pin when the newest files aren't valid", async () => {
    serveDumps("hideouts.json");
    await writeSource(join(packageDir, "source.json"), pinned);

    await expect(run(true)).rejects.toThrow("hideouts.json: ");
    await expect(readSource(join(packageDir, "source.json"))).resolves.toEqual(
      pinned,
    );
  });
});
