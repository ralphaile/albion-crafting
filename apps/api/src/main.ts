import { shownItemIds } from "@aoc/crafting-data";
import { createAodpClient } from "@aoc/market-prices";

import { buildApp } from "./app.helpers.js";
import { readConfig } from "./config.schema.js";
import { openPostgresPriceStore } from "./postgres-prices.store.js";
import { refreshPrices } from "./refresh.helpers.js";
import { runEvery, type Schedule } from "./schedule.helpers.js";

const config = readConfig(process.env);
const store = await openPostgresPriceStore(config.DATABASE_URL);
// Pino's JSON lines: one object per request and per refresh.
const app = buildApp({ store, logger: true, corsOrigin: config.CORS_ORIGIN });

// One client, so every server's requests share its rate limiter.
const aodp = createAodpClient();
const itemIds = shownItemIds();
const schedule: Schedule | undefined =
  config.REFRESH_MINUTES === 0
    ? undefined
    : runEvery(
        config.REFRESH_MINUTES * 60_000,
        async (signal) => {
          app.log.info({ items: itemIds.length }, "Refreshing prices");
          const reports = await refreshPrices(
            store,
            (ids, marketIds, qualities, options) =>
              aodp.getPrices(ids, marketIds, qualities, options),
            itemIds,
            config.REGIONS,
            { signal },
          );
          for (const report of reports) {
            app.log.info(report, "Refreshed prices");
          }
        },
        (error) => {
          app.log.error({ err: error }, "Refreshing prices failed");
        },
      );

let stopping = false;
async function shutDown(signal: string) {
  if (stopping) {
    return;
  }
  stopping = true;
  app.log.info({ signal }, "Shutting down");
  await schedule?.stop();
  await app.close();
  await store.close();
}
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void shutDown(signal);
  });
}

await app.listen({ host: config.HOST, port: config.PORT });
