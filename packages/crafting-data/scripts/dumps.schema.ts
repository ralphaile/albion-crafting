import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { z } from "zod";

import { FILES } from "./download.constants.ts";
import { dumpSchemas } from "./dump-files.schema.ts";

const dumpsSchema = z.object(dumpSchemas);

export type Dumps = z.output<typeof dumpsSchema>;

const MAX_PROBLEMS = 10;

export async function validate(dir: string): Promise<Dumps> {
  const files = await Promise.all(
    FILES.map(async (file) => [file, await readJson(dir, file)] as const),
  );
  return parseDumps(Object.fromEntries(files));
}

async function readJson(dir: string, file: string): Promise<unknown> {
  const text = await readFile(join(dir, file), "utf8");
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${file} isn't valid JSON`, { cause: error });
  }
}

export function parseDumps(files: unknown): Dumps {
  const result = dumpsSchema.safeParse(files);
  if (result.success) {
    return result.data;
  }
  const problems = result.error.issues.map(describe);
  const shown = problems.slice(0, MAX_PROBLEMS);
  if (problems.length > MAX_PROBLEMS) {
    shown.push(`…and ${String(problems.length - MAX_PROBLEMS)} more`);
  }
  throw new Error(
    `The game data doesn't match what the app reads:\n${shown.map((problem) => `  ${problem}`).join("\n")}`,
  );
}

function describe({
  path: [file, ...rest],
  message,
}: z.core.$ZodIssue): string {
  const location = rest
    .map((key) =>
      typeof key === "number" ? `[${String(key)}]` : `.${String(key)}`,
    )
    .join("")
    .replace(/^\./, "");
  return location
    ? `${String(file)}: ${location}: ${message}`
    : `${String(file)}: ${message}`;
}
