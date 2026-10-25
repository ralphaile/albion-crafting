import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchLatestCommit,
  readSource,
  type Source,
  writeSource,
} from "./source.ts";
import { server } from "../test/setup.ts";

const source: Source = {
  repository: "ao-data/ao-bin-dumps",
  commit: "1a469e53de028c5f85cdd80505f10cbd0a2515cf",
  committedAt: "2026-10-12T11:25:12Z",
};

const latestCommitUrl =
  "https://api.github.com/repos/ao-data/ao-bin-dumps/commits/master";

function latestCommit() {
  return HttpResponse.json({
    sha: source.commit,
    commit: { committer: { date: source.committedAt } },
  });
}

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "aoc-source-"));
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(dir, { recursive: true, force: true });
});

describe("readSource and writeSource", () => {
  it("writes the pin as formatted JSON and reads it back", async () => {
    const path = join(dir, "source.json");

    await writeSource(path, source);

    expect(await readFile(path, "utf8")).toBe(
      [
        "{",
        '  "repository": "ao-data/ao-bin-dumps",',
        '  "commit": "1a469e53de028c5f85cdd80505f10cbd0a2515cf",',
        '  "committedAt": "2026-10-12T11:25:12Z"',
        "}",
        "",
      ].join("\n"),
    );
    await expect(readSource(path)).resolves.toEqual(source);
  });

  it("says how to create a missing pin", async () => {
    await expect(readSource(join(dir, "source.json"))).rejects.toThrow(
      "Run pnpm data:update --latest to create it.",
    );
  });

  it("rejects a short commit SHA and names the field", async () => {
    const path = join(dir, "source.json");
    await writeFile(path, JSON.stringify({ ...source, commit: "1a469e53de" }));

    await expect(readSource(path)).rejects.toThrow(
      /expected a full 40-character commit SHA\s+→ at commit/,
    );
  });
});

describe("fetchLatestCommit", () => {
  it("returns the newest commit on master", async () => {
    server.use(http.get(latestCommitUrl, latestCommit));

    await expect(fetchLatestCommit()).resolves.toEqual(source);
  });

  it("sends GITHUB_TOKEN when it's set", async () => {
    vi.stubEnv("GITHUB_TOKEN", "test-token");
    let authorization: string | null = null;
    server.use(
      http.get(latestCommitUrl, ({ request }) => {
        authorization = request.headers.get("Authorization");
        return latestCommit();
      }),
    );

    await fetchLatestCommit();

    expect(authorization).toBe("Bearer test-token");
  });

  it("sends no token when GITHUB_TOKEN isn't set", async () => {
    vi.stubEnv("GITHUB_TOKEN", undefined);
    let authorization: string | null = "not checked";
    server.use(
      http.get(latestCommitUrl, ({ request }) => {
        authorization = request.headers.get("Authorization");
        return latestCommit();
      }),
    );

    await fetchLatestCommit();

    expect(authorization).toBeNull();
  });

  it("reports GitHub's status when the request fails", async () => {
    server.use(
      http.get(latestCommitUrl, () =>
        HttpResponse.json(
          { message: "API rate limit exceeded" },
          { status: 403 },
        ),
      ),
    );

    await expect(fetchLatestCommit()).rejects.toThrow("HTTP 403");
  });
});
