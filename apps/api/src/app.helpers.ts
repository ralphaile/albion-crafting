import etag from "@fastify/etag";
import Fastify, { type FastifyInstance } from "fastify";

import { pricesNeeded } from "@aoc/core";
import { recipes } from "@aoc/crafting-data";
import { normalizePrices } from "@aoc/market-prices";

import {
  bestCrafts,
  chosenRecipes,
  cityPlace,
  settingsOf,
} from "./best-crafts.helpers.js";
import type { PriceStore } from "./price-store.types.js";
import {
  bestCraftsQuerySchema,
  pricesQuerySchema,
  queryProblem,
} from "./query.schema.js";

// Prices change every refresh, so a browser or proxy may keep an answer a
// minute, and asks again with its ETag after that.
const CACHE_CONTROL = "public, max-age=60";
const STALE_AFTER_MINUTES = 12 * 60;

export function buildApp({
  store,
  logger,
  corsOrigin = "*",
}: {
  store: PriceStore;
  logger: boolean;
  corsOrigin?: string;
}): FastifyInstance {
  const app = Fastify({ logger });
  void app.register(etag);

  // Only simple GETs, so no preflight is needed.
  app.addHook("onSend", async (_request, reply) => {
    reply.header("Access-Control-Allow-Origin", corsOrigin);
  });

  app.get("/health", async (_request, reply) => {
    reply.header("Cache-Control", "no-store");
    try {
      await store.ping();
      return { status: "ok" };
    } catch (error) {
      app.log.error({ err: error }, "The database can't be reached");
      return reply.code(503).send({ status: "error" });
    }
  });

  // The rows AODP gave for each item, market and quality asked, in AODP's
  // own shape, so the web app can read them as it reads AODP.
  app.get("/prices", async (request, reply) => {
    const query = pricesQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.code(400).send({ error: queryProblem(query.error) });
    }
    const { region, items, locations, qualities } = query.data;
    const { rows } = await store.read(region, items, locations, qualities);
    reply.header("Cache-Control", CACHE_CONTROL);
    return rows;
  });

  app.get("/bestcrafts", async (request, reply) => {
    const query = bestCraftsQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.code(400).send({ error: queryProblem(query.error) });
    }
    const place = cityPlace(query.data.location);
    if (place === undefined) {
      return reply
        .code(400)
        .send({ error: `No crafting location ${query.data.location}` });
    }
    const chosen = chosenRecipes(recipes, query.data);
    const { products, materials } = pricesNeeded(chosen);
    const { region, buy, sell } = query.data;
    const [bought, sold] = await Promise.all([
      store.read(region, materials, [buy], [1]),
      store.read(region, products, [sell], [1]),
    ]);
    const options = { staleAfterMinutes: STALE_AFTER_MINUTES };
    const crafts = bestCrafts(
      chosen,
      place,
      settingsOf(query.data),
      {
        materials: normalizePrices(bought.rows, options),
        products: normalizePrices(sold.rows, options),
      },
      query.data,
    );
    const fetchedAt = [bought.fetchedAt, sold.fetchedAt].filter(
      (at) => at !== undefined,
    );
    reply.header("Cache-Control", CACHE_CONTROL);
    return {
      crafts,
      fetchedAt: fetchedAt.length > 0 ? Math.min(...fetchedAt) : null,
    };
  });

  return app;
}
