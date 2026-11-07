import { z } from "zod";

const date = z.iso.datetime({ local: true });

export const snapshotSchema = z.object({
  fetchedAt: z.number(),
  rows: z.array(z.tuple([z.string(), z.number(), date, z.number(), date])),
});
