import { z } from "zod";

import { NO_PINS } from "./material-pins.constants";
import type { MaterialPins } from "./material-pins.types";
import { BUY_MARKET_IDS } from "./route.schema";

const pinsSchema = z.record(z.string(), z.unknown());

// A pin to a market the app doesn't have is left out.
export function parsePins(raw: unknown): MaterialPins {
  const parsed = pinsSchema.safeParse(raw);
  if (!parsed.success) {
    return NO_PINS;
  }
  return Object.fromEntries(
    Object.entries(parsed.data).filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === "string" && BUY_MARKET_IDS.includes(entry[1]),
    ),
  );
}
