import { describe, expect, it } from "vitest";

import { readConfig } from "./config.schema.js";

const DATABASE_URL = "postgres://aoc:aoc@localhost:5432/aoc";

describe("readConfig", () => {
  it("fills in the defaults", () => {
    expect(readConfig({ DATABASE_URL })).toEqual({
      DATABASE_URL,
      HOST: "0.0.0.0",
      PORT: 3000,
      REGIONS: ["west", "europe", "east"],
      REFRESH_MINUTES: 30,
      CORS_ORIGIN: "*",
    });
  });

  it("reads the servers to refresh as a list", () => {
    expect(
      readConfig({ DATABASE_URL, REGIONS: "europe, east" }).REGIONS,
    ).toEqual(["europe", "east"]);
  });

  it.each([
    {},
    { DATABASE_URL, PORT: "http" },
    { DATABASE_URL, REGIONS: "moon" },
  ])("refuses %o", (env) => {
    expect(() => readConfig(env)).toThrow(/Bad configuration/);
  });
});
