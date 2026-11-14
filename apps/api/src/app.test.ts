import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "./app.helpers.js";
import { aodpPrice, memoryPriceStore } from "../test/memory-prices.store.js";

let store: ReturnType<typeof memoryPriceStore>;
let app: ReturnType<typeof buildApp>;

beforeEach(() => {
  store = memoryPriceStore();
  app = buildApp({ store, logger: false });
});

afterEach(async () => {
  await app.close();
});

describe("GET /health", () => {
  it("answers ok while the database answers", async () => {
    const response = await app.inject("/health");

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });

  it("answers 503 when the database doesn't", async () => {
    store.reachable = false;

    const response = await app.inject("/health");

    expect(response.statusCode).toBe(503);
  });
});

describe("GET /prices", () => {
  beforeEach(async () => {
    await store.save(
      "west",
      [
        aodpPrice("T4_BAG", "Caerleon", 1000),
        aodpPrice("T4_BAG", "Lymhurst", 1100),
        aodpPrice("T4_BAG", "Caerleon", 3000, { quality: 2 }),
        aodpPrice("T5_BAG", "Caerleon", 5000),
      ],
      Date.UTC(2026, 10, 14, 10),
    );
  });

  it("answers AODP's rows for the items, markets and qualities asked", async () => {
    const response = await app.inject(
      "/prices?items=T4_BAG,T5_BAG&locations=caerleon",
    );

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([
      aodpPrice("T4_BAG", "Caerleon", 1000),
      aodpPrice("T5_BAG", "Caerleon", 5000),
    ]);
    expect(response.headers["cache-control"]).toBe("public, max-age=60");
    expect(response.headers["access-control-allow-origin"]).toBe("*");
  });

  it("answers nothing for another server", async () => {
    const response = await app.inject(
      "/prices?items=T4_BAG&locations=Caerleon&region=europe",
    );

    expect(response.json()).toEqual([]);
  });

  it("answers 304 to a request with the same ETag", async () => {
    const url = "/prices?items=T4_BAG&locations=Caerleon&qualities=1,2";
    const first = await app.inject(url);

    const again = await app.inject({
      url,
      headers: { "if-none-match": String(first.headers.etag) },
    });

    expect(first.json()).toHaveLength(2);
    expect(again.statusCode).toBe(304);
  });

  it.each([
    "/prices?locations=Caerleon",
    "/prices?items=t4_bag&locations=Caerleon",
    "/prices?items=T4_BAG&locations=Caerleon&qualities=6",
    "/prices?items=T4_BAG&locations=Caerleon&region=moon",
  ])("answers 400 to %s", async (url) => {
    const response = await app.inject(url);

    expect(response.statusCode).toBe(400);
    expect(response.json()).toHaveProperty("error");
  });
});

describe("GET /bestcrafts", () => {
  const fetchedAt = Date.UTC(2026, 10, 14, 10);

  beforeEach(async () => {
    await store.save(
      "west",
      [
        aodpPrice("T4_METALBAR", "Martlock", 100),
        aodpPrice("T4_LEATHER", "Martlock", 100),
        aodpPrice("T4_MAIN_SWORD", "Caerleon", 20_000),
        aodpPrice("T4_MAIN_SWORD", "Martlock", 1),
      ],
      fetchedAt,
    );
  });

  it("ranks a city's crafts, bought in one market and sold in another", async () => {
    const response = await app.inject(
      "/bestcrafts?location=Thetford&buy=Martlock&sell=Caerleon&tiers=4&enchants=0&categories=sword&limit=3",
    );

    expect(response.statusCode).toBe(200);
    const { crafts, fetchedAt: oldest } = response.json<{
      crafts: { itemId: string; name: string; status: string }[];
      fetchedAt: number;
    }>();
    expect(crafts).toHaveLength(3);
    expect(crafts[0]).toMatchObject({
      itemId: "T4_MAIN_SWORD",
      name: "Adept's Broadsword 4.0",
      status: "complete",
    });
    expect(oldest).toBe(fetchedAt);
  });

  it("answers no fetch time with no prices", async () => {
    const response = await app.inject(
      "/bestcrafts?location=Thetford&buy=Martlock&sell=Caerleon&region=east&tiers=4",
    );

    expect(response.json()).toMatchObject({ fetchedAt: null });
  });

  it.each([
    "/bestcrafts?location=Atlantis&buy=Martlock&sell=Caerleon",
    "/bestcrafts?location=Thetford&buy=Martlock",
    "/bestcrafts?location=Thetford&buy=Martlock&sell=Caerleon&focus=yes",
    "/bestcrafts?location=Thetford&buy=Martlock&sell=Caerleon&tiers=9",
  ])("answers 400 to %s", async (url) => {
    const response = await app.inject(url);

    expect(response.statusCode).toBe(400);
  });
});
