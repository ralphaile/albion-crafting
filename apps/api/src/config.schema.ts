import { z } from "zod";

const REGIONS = ["west", "europe", "east"] as const;

const configSchema = z.object({
  DATABASE_URL: z.url(),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  REGIONS: z
    .string()
    .default(REGIONS.join(","))
    .transform((value) => value.split(",").map((region) => region.trim()))
    .pipe(z.array(z.enum(REGIONS)).min(1)),
  // 0 turns the refresh off, for a server that only reads.
  REFRESH_MINUTES: z.coerce.number().int().min(0).default(30),
  // The site that may call the API from a browser.
  CORS_ORIGIN: z.string().default("*"),
});

export type Config = z.output<typeof configSchema>;

export function readConfig(env: NodeJS.ProcessEnv): Config {
  const parsed = configSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Bad configuration: ${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}
