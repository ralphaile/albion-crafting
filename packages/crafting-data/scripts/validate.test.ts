import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { FILES } from "./download.ts";
import { parseDumps, validate } from "./validate.ts";

const fixtures = fileURLToPath(
  new URL("../test/fixtures/dumps", import.meta.url),
);

async function readFixtures(): Promise<Record<string, unknown>> {
  const files = await Promise.all(
    FILES.map(async (file): Promise<[string, unknown]> => [
      file,
      JSON.parse(await readFile(join(fixtures, file), "utf8")),
    ]),
  );
  return Object.fromEntries(files);
}

function at(data: unknown, path: (string | number)[]): Record<string, unknown> {
  return path.reduce<unknown>(
    (node, key) => (node as Record<string | number, unknown>)[key],
    data,
  ) as Record<string, unknown>;
}

describe("validate", () => {
  it("returns recipes with numbers and lists, even where the file has one object", async () => {
    const { weapon } = (await validate(fixtures))["items.json"].items;
    const [sword, bow, scimitar] = weapon;

    expect(sword).toEqual({
      "@uniquename": "T4_MAIN_SWORD",
      "@tier": 4,
      "@shopcategory": "weapons",
      "@shopsubcategory1": "sword",
      "@craftingcategory": "sword",
      craftingrequirements: [
        {
          "@silver": 0,
          "@craftingfocus": 1286,
          craftresource: [
            { "@uniquename": "T4_METALBAR", "@count": 16 },
            { "@uniquename": "T4_LEATHER", "@count": 8 },
          ],
        },
      ],
      enchantments: {
        enchantment: [
          expect.objectContaining({ "@enchantmentlevel": 1 }),
          expect.objectContaining({ "@enchantmentlevel": 2 }),
        ],
      },
    });
    expect(bow?.craftingrequirements?.[0]?.craftresource).toEqual([
      { "@uniquename": "T4_PLANKS", "@count": 32 },
    ]);
    expect(scimitar?.craftingrequirements).toHaveLength(2);
    expect(scimitar?.craftingrequirements?.[0]?.craftresource?.[2]).toEqual({
      "@uniquename": "T6_ARTEFACT_MAIN_SCIMITAR_MORGANA",
      "@count": 1,
      "@maxreturnamount": 0,
    });
  });

  it("returns item values, names, clusters and bonuses", async () => {
    const dumps = await validate(fixtures);
    const locations =
      dumps["craftingmodifiers.json"].craftingmodifiers.craftinglocation;

    expect(dumps["items.json"].items.simpleitem[0]).toEqual({
      "@uniquename": "T4_METALBAR",
      "@tier": 4,
      "@enchantmentlevel": 0,
      "@itemvalue": 16,
    });
    expect(dumps["formatted/items.json"][0]).toEqual({
      UniqueName: "T4_MAIN_SWORD",
      LocalizedNames: { "EN-US": "Adept's Broadsword" },
    });
    expect(dumps["formatted/items.json"].at(-1)?.LocalizedNames).toBeNull();
    expect(dumps["formatted/world.json"][0]).toEqual({
      Index: "0000",
      UniqueName: "Thetford",
    });
    expect(locations[0]).toMatchObject({
      "@clusterid": "0000",
      craftingbonus: { "@value": 0.18, "@islandvalue": 0 },
    });
    expect(locations[0]?.craftingmodifier).toContainEqual({
      "@name": "mace",
      "@value": 0.15,
    });
    expect(locations[3]).toMatchObject({
      "@biome": "SWAMP",
      "@clusterquality": "Q6",
    });
    expect(
      dumps["hideouts.json"].hideouts.hideout.powerlevels.powerlevel,
    ).toEqual([
      { "@level": 1 },
      {
        "@level": 2,
        "@generalistcraftingbonus": 0.06,
        "@specialistcraftingbonus": 0.0375,
      },
      {
        "@level": 9,
        "@generalistcraftingbonus": 0.26,
        "@specialistcraftingbonus": 0.3,
      },
    ]);
  });

  it("drops the fields the app doesn't read", async () => {
    const [sword] = (await validate(fixtures))["items.json"].items.weapon;

    expect(sword).not.toHaveProperty("@weight");
    expect(sword).not.toHaveProperty("SocketPreset");
    expect(sword?.enchantments?.enchantment[0]).not.toHaveProperty(
      "upgraderequirements",
    );
  });

  it("names a file that isn't valid JSON", async () => {
    const dir = await mkdtemp(join(tmpdir(), "aoc-validate-"));
    try {
      await cp(fixtures, dir, { recursive: true });
      await writeFile(join(dir, "hideouts.json"), "{");

      await expect(validate(dir)).rejects.toThrow(
        "hideouts.json isn't valid JSON",
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("parseDumps", () => {
  it("names the file and the path of a missing field", async () => {
    const files = await readFixtures();
    const metalBars = at(files, [
      "items.json",
      "items",
      "weapon",
      0,
      "craftingrequirements",
      "craftresource",
      0,
    ]);
    delete metalBars["@count"];

    expect(() => parseDumps(files)).toThrow(
      "items.json: items.weapon[0].craftingrequirements[0].craftresource[0].@count: Invalid input: expected string, received undefined",
    );
  });

  it("rejects a number field that isn't a number", async () => {
    const files = await readFixtures();
    at(files, ["items.json", "items", "simpleitem", 0])["@tier"] = "four";

    expect(() => parseDumps(files)).toThrow(
      "items.json: items.simpleitem[0].@tier: expected a number",
    );
  });

  it("rejects a renamed list", async () => {
    const files = await readFixtures();
    const modifiers = at(files, [
      "craftingmodifiers.json",
      "craftingmodifiers",
    ]);
    modifiers.craftinglocations = modifiers.craftinglocation;
    delete modifiers.craftinglocation;

    expect(() => parseDumps(files)).toThrow(
      "craftingmodifiers.json: craftingmodifiers.craftinglocation: Invalid input: expected array, received undefined",
    );
  });

  it("needs a cluster ID, or a biome and a quality, for each location", async () => {
    const files = await readFixtures();
    delete at(files, [
      "craftingmodifiers.json",
      "craftingmodifiers",
      "craftinglocation",
      0,
    ])["@clusterid"];

    expect(() => parseDumps(files)).toThrow(
      "craftingmodifiers.json: craftingmodifiers.craftinglocation[0]: expected @clusterid, or @biome and @clusterquality",
    );
  });

  it("reports the problems in every file at once", async () => {
    const files = await readFixtures();
    delete at(files, ["formatted/world.json", 0]).UniqueName;
    at(files, [
      "hideouts.json",
      "hideouts",
      "hideout",
      "powerlevels",
    ]).powerlevel = { "@level": "max" };

    expect(() => parseDumps(files)).toThrow(
      [
        "  formatted/world.json: [0].UniqueName: Invalid input: expected string, received undefined",
        "  hideouts.json: hideouts.hideout.powerlevels.powerlevel[0].@level: expected a number",
      ].join("\n"),
    );
  });

  it("lists at most 10 problems", async () => {
    const files = await readFixtures();
    files["formatted/items.json"] = Array.from({ length: 12 }, () => ({
      LocalizedNames: null,
    }));

    expect(() => parseDumps(files)).toThrow(
      /\[9\]\.UniqueName: Invalid input: expected string, received undefined\n {2}…and 2 more$/,
    );
  });
});
