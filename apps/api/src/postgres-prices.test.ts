import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "./app.helpers.js";
import { openPostgresPriceStore } from "./postgres-prices.store.js";
import type { PriceStore } from "./price-store.types.js";
import { aodpPrice } from "../test/memory-prices.store.js";

// Needs Docker, which CI has. Locally: `CI=1 pnpm exec vitest run` with Docker running.
describe.skipIf(process.env.CI === undefined)("Postgres price store", () => {
  let container: StartedPostgreSqlContainer;
  let store: PriceStore;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:17-alpine").start();
    store = await openPostgresPriceStore(container.getConnectionUri());
  });

  afterAll(async () => {
    await store.close();
    await container.stop();
  });

  it("keeps the newest price of each server, item, market and quality", async () => {
    await store.save(
      "west",
      [
        aodpPrice("T4_BAG", "Caerleon", 1000),
        aodpPrice("T4_BAG", "Caerleon", 3000, { quality: 2 }),
      ],
      1000,
    );
    await store.save("europe", [aodpPrice("T4_BAG", "Caerleon", 9000)], 1000);
    await store.save(
      "west",
      [aodpPrice("T4_BAG", "Caerleon", 1200, { date: "2026-11-14T11:00:00" })],
      2000,
    );

    await expect(
      store.read("west", ["T4_BAG"], ["CAERLEON"], [1]),
    ).resolves.toEqual({
      rows: [
        aodpPrice("T4_BAG", "Caerleon", 1200, { date: "2026-11-14T11:00:00" }),
      ],
      fetchedAt: 2000,
    });
    await expect(store.read("west", ["T4_BAG"], [], [1])).resolves.toEqual({
      rows: [],
      fetchedAt: undefined,
    });
    await expect(store.ping()).resolves.toBeUndefined();
  });

  it("saves more rows than one statement takes", async () => {
    const itemIds = Array.from(
      { length: 5000 },
      (_, index) => `T4_ITEM_${String(index)}`,
    );

    await store.save(
      "east",
      itemIds.map((itemId) => aodpPrice(itemId, "Martlock", 100)),
      1000,
    );

    const { rows } = await store.read("east", itemIds, ["Martlock"], [1]);
    expect(rows).toHaveLength(5000);
  });

  it("answers 150 items' prices in every market within 300 ms at the 95th percentile", async () => {
    const markets = [
      "Caerleon",
      "Bridgewatch",
      "Fort Sterling",
      "Lymhurst",
      "Martlock",
      "Thetford",
      "Brecilien",
      "Black Market",
    ];
    const itemIds = Array.from(
      { length: 150 },
      (_, index) => `T5_ITEM_${String(index)}`,
    );
    await store.save(
      "west",
      itemIds.flatMap((itemId) =>
        markets.map((market) => aodpPrice(itemId, market, 100)),
      ),
      1000,
    );
    const app = buildApp({ store, logger: false });
    const url = `/prices?items=${itemIds.join(",")}&locations=${markets.map((market) => encodeURIComponent(market)).join(",")}`;

    const times: number[] = [];
    for (let run = 0; run < 40; run += 1) {
      const startedAt = performance.now();
      const response = await app.inject(url);
      times.push(performance.now() - startedAt);
      expect(response.json()).toHaveLength(1200);
    }
    await app.close();

    const p95 = times.toSorted((a, b) => a - b)[
      Math.floor(times.length * 0.95)
    ];
    expect(p95).toBeLessThan(300);
  });
});
