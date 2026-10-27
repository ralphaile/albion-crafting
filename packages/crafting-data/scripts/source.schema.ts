import { readFile, writeFile } from "node:fs/promises";

import { z } from "zod";

const sourceSchema = z.object({
  repository: z.string(),
  commit: z
    .string()
    .regex(/^[0-9a-f]{40}$/, "expected a full 40-character commit SHA"),
  committedAt: z.iso.datetime(),
});

export type Source = z.infer<typeof sourceSchema>;

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
