import { z } from "zod";

import type { Source } from "./source.schema.ts";

const REPOSITORY = "ao-data/ao-bin-dumps";
const BRANCH = "master";

const latestCommitSchema = z.object({
  sha: z.string(),
  commit: z.object({ committer: z.object({ date: z.string() }) }),
});

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
