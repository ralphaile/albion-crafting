import { readFile, writeFile } from "node:fs/promises";

import { z } from "zod";

const REPOSITORY = "ao-data/ao-bin-dumps";
const BRANCH = "master";

const sourceSchema = z.object({
  repository: z.string(),
  commit: z
    .string()
    .regex(/^[0-9a-f]{40}$/, "expected a full 40-character commit SHA"),
  committedAt: z.iso.datetime(),
});

export type Source = z.infer<typeof sourceSchema>;

const latestCommitSchema = z.object({
  sha: z.string(),
  commit: z.object({ committer: z.object({ date: z.string() }) }),
});

export async function readSource(path: string): Promise<Source> {
  const text = await readFile(path, "utf8").catch((error: unknown) => {
    throw new Error(
      `Can't read ${path}. Run pnpm data:update --latest to create it.`,
      { cause: error },
    );
  });
  const result = sourceSchema.safeParse(JSON.parse(text));
  if (!result.success) {
    throw new Error(`${path} is invalid:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

export async function writeSource(path: string, source: Source): Promise<void> {
  await writeFile(path, `${JSON.stringify(source, null, 2)}\n`);
}

export async function fetchLatestCommit(): Promise<Source> {
  const headers = new Headers({ Accept: "application/vnd.github+json" });
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const response = await fetch(
    `https://api.github.com/repos/${REPOSITORY}/commits/${BRANCH}`,
    { headers },
  );
  if (!response.ok) {
    throw new Error(
      `GitHub answered HTTP ${String(response.status)} when asked for the latest ${REPOSITORY} commit`,
    );
  }
  const { sha, commit } = latestCommitSchema.parse(await response.json());
  return {
    repository: REPOSITORY,
    commit: sha,
    committedAt: commit.committer.date,
  };
}
