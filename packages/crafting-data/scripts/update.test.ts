import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { readSource, type Source, writeSource } from "./source.schema.ts";
import { update } from "./update.helpers.ts";
import { server } from "../test/setup.ts";

const fixtures = fileURLToPath(
  new URL("../test/fixtures/dumps", import.meta.url),
);

const pinned: Source = {
  repository: "ao-data/ao-bin-dumps",
  commit: "1a469e53de028c5f85cdd80505f10cbd0a2515cf",
  committedAt: "2026-10-12T11:25:12Z",
};

const newest: Source = {
  repository: "ao-data/ao-bin-dumps",
  commit: "2b57af64ef139d6f96dee91616f20dce1b1626d0",
  committedAt: "2026-10-19T09:00:00Z",
};

function serveDumps(replaced: Record<string, string> = {}) {
  server.use(
    http.get(
      "https://api.github.com/repos/ao-data/ao-bin-dumps/commits/master",
      () =>
        HttpResponse.json({
          sha: newest.commit,
          commit: { committer: { date: newest.committedAt } },
        }),
    ),
    http.get(
      "https://raw.githubusercontent.com/ao-data/ao-bin-dumps/:commit/*",
      async ({ request }) => {
        const file = new URL(request.url).pathname
          .split("/")
          .slice(4)
          .join("/");
        return HttpResponse.text(
          replaced[file] ?? (await readFile(join(fixtures, file), "utf8")),
        );
      },
    ),
  );
}

let packageDir: string;
let lines: string[];
let warnings: string[];

function run(latest: boolean) {
  return update({
    latest,
    packageDir,
    log: (line) => lines.push(line),
    warn: (line) => warnings.push(line),
  });
}

function recipesPath() {
  return join(packageDir, "src", "generated", "recipes.json");
}

beforeEach(async () => {
  packageDir = await mkdtemp(join(tmpdir(), "aoc-update-"));
  lines = [];
  warnings = [];
});

afterEach(async () => {
  await rm(packageDir, { recursive: true, force: true });
});

describe("update", () => {
  it("downloads and validates the pinned commit", async () => {
    serveDumps();
    await writeSource(join(packageDir, "source.json"), pinned);

    await run(false);

    expect(lines).toEqual([
      "ao-data/ao-bin-dumps at 1a469e53de, committed 2026-10-12T11:25:12Z",
      "Downloaded the files to raw/",
      "Valid: 3 weapons, 1 shapeshifter staffs, 2 equipment items, 19 simple items, 7 names, 4 clusters, 5 crafting locations, 3 power levels",
      "Extracted 3 crafting locations: Thetford, Arthur's Rest, Island",
      "Extracted the hideout bonuses for 1 biomes (Swamp), 2 map qualities and 3 power levels",
      "Extracted 17 recipes for 6 items: 4 weapons, 0 armors, 2 head, 0 shoes, 0 offhands",
      "Named 6 item IDs: 4 crafted, which the search covers, and 2 materials",
    ]);
    expect(existsSync(join(packageDir, "raw", "hideouts.json"))).toBe(true);
    await expect(readSource(join(packageDir, "source.json"))).resolves.toEqual(
      pinned,
    );
  });

  it("writes the crafting locations to src/generated/locations.json, one per line", async () => {
    serveDumps();
    await writeSource(join(packageDir, "source.json"), pinned);

    await run(false);

    const text = await readFile(
      join(packageDir, "src", "generated", "locations.json"),
      "utf8",
    );
    expect(text.split("\n")).toEqual([
      "[",
      '{"id":"0000","name":"Thetford","craftingBonus":0.18,"specialties":{"meat_pig":0.1,"mace":0.15,"naturestaff":0.15,"firestaff":0.15,"leather_armor":0.15,"cloth_helmet":0.15}},',
      '{"id":"4300","name":"Arthur\'s Rest","craftingBonus":0.18,"specialties":{"axe":0.15,"crossbow":0.15,"hammer":0.15,"mace":0.15,"sword":0.15,"knuckles":0.15,"plate_helmet":0.15,"plate_armor":0.15,"plate_shoes":0.15}},',
      '{"id":"island","name":"Island","craftingBonus":0,"specialties":{}}',
      "]",
      "",
    ]);
  });

  it("writes nothing when the cities and Rests give islands different bonuses", async () => {
    const modifiers = await readFile(
      join(fixtures, "craftingmodifiers.json"),
      "utf8",
    );
    serveDumps({
      "craftingmodifiers.json": modifiers.replace(
        /("craftingbonus": \{\s+"@value": "0.18",\s+"@islandvalue": )"0"/,
        '$1"0.05"',
      ),
    });
    await writeSource(join(packageDir, "source.json"), pinned);

    await expect(run(false)).rejects.toThrow(
      "Expected the cities and Rests to give islands one crafting bonus, but found 0.05, 0",
    );
    expect(existsSync(join(packageDir, "src", "generated"))).toBe(false);
  });

  it("writes the hideout bonuses to src/generated/hideouts.json, one row per line", async () => {
    serveDumps();
    await writeSource(join(packageDir, "source.json"), pinned);

    await run(false);

    const text = await readFile(
      join(packageDir, "src", "generated", "hideouts.json"),
      "utf8",
    );
    expect(text.split("\n")).toEqual([
      "{",
      '"biomes": [',
      '{"id":"SWAMP","name":"Swamp","cityId":"0000","specialties":["mace","naturestaff","firestaff","leather_armor","cloth_helmet"]}',
      "],",
      '"mapQualities": [',
      '{"quality":1,"specialtyBonus":0.01},',
      '{"quality":6,"specialtyBonus":0.26}',
      "],",
      '"powerLevels": [',
      '{"level":1,"generalBonus":0,"specialistBonus":0},',
      '{"level":2,"generalBonus":0.06,"specialistBonus":0.0375},',
      '{"level":9,"generalBonus":0.26,"specialistBonus":0.3}',
      "],",
      '"refiningBonus": 0.15',
      "}",
      "",
    ]);
  });

  it("writes nothing when the hideouts stop fitting the tables", async () => {
    const modifiers = await readFile(
      join(fixtures, "craftingmodifiers.json"),
      "utf8",
    );
    serveDumps({
      "craftingmodifiers.json": modifiers.replace(
        '"@value": "0.26"',
        '"@value": "0.27"',
      ),
    });
    await writeSource(join(packageDir, "source.json"), pinned);

    await expect(run(false)).rejects.toThrow(
      "Expected one specialty bonus at map quality Q6, but found 0.27; 0.26",
    );
    expect(existsSync(join(packageDir, "src", "generated"))).toBe(false);
  });

  it("writes the recipes to src/generated, one per line", async () => {
    serveDumps();
    await writeSource(join(packageDir, "source.json"), pinned);

    await run(false);

    const text = await readFile(recipesPath(), "utf8");
    const lines = text.trimEnd().split("\n");
    expect(lines).toHaveLength(17 + 2);
    expect(lines[0]).toBe("[");
    expect(lines[1]).toMatch(/^\{"itemId":"T4_2H_BOW",.*\},$/);
    expect(lines.at(-2)).toMatch(
      /^\{"itemId":"T6_MAIN_SCIMITAR_MORGANA@2",.*\}$/,
    );
    expect(lines.at(-1)).toBe("]");
    expect(JSON.parse(text)).toHaveLength(17);
  });

  it("writes the item names to src/generated/items.json, one per line", async () => {
    serveDumps();
    await writeSource(join(packageDir, "source.json"), pinned);

    await run(false);

    const text = await readFile(
      join(packageDir, "src", "generated", "items.json"),
      "utf8",
    );
    expect(text.split("\n").slice(1, 3)).toEqual([
      '{"id":"QUESTITEM_TOKEN_ROYAL_T4","name":"Adept\'s Royal Sigil"},',
      '{"id":"T4_2H_BOW","name":"Adept\'s Bow 4.0","crafted":true},',
    ]);
    expect(JSON.parse(text)).toHaveLength(6);
    expect(warnings).toContainEqual(
      expect.stringMatching(/^Warning: No EN-US name for 36 item IDs, /),
    );
  });

  it("writes each recipe's item value, and warns about the materials that have none", async () => {
    serveDumps();
    await writeSource(join(packageDir, "source.json"), pinned);

    await run(false);

    const recipes = JSON.parse(await readFile(recipesPath(), "utf8")) as {
      itemId: string;
      itemValue?: number;
    }[];
    expect(
      recipes.find((recipe) => recipe.itemId === "T4_MAIN_SWORD")?.itemValue,
    ).toBe(384);
    expect(warnings.filter((line) => line.includes("@itemvalue"))).toEqual([
      "Warning: No @itemvalue for T3_ALCHEMY_RARE_PANTHER, so these have no item value: T4_2H_SHAPESHIFTER_SET1, T4_2H_SHAPESHIFTER_SET1@1, T4_2H_SHAPESHIFTER_SET1@2",
      "Warning: No @itemvalue for T4_HEAD_CLOTH_SET1, so these have no item value: T4_HEAD_CLOTH_ROYAL",
      "Warning: No @itemvalue for T4_HEAD_CLOTH_SET1@1, so these have no item value: T4_HEAD_CLOTH_ROYAL@1",
    ]);
  });

  it("with --latest, pins the newest commit once its files are valid", async () => {
    serveDumps();
    await writeSource(join(packageDir, "source.json"), pinned);

    await run(true);

    expect(lines.at(-1)).toBe("Pinned 2b57af64ef in source.json");
    await expect(readSource(join(packageDir, "source.json"))).resolves.toEqual(
      newest,
    );
  });

  it("with --latest, keeps the old pin when the newest files aren't valid", async () => {
    serveDumps({ "hideouts.json": "[]" });
    await writeSource(join(packageDir, "source.json"), pinned);

    await expect(run(true)).rejects.toThrow("hideouts.json: ");
    await expect(readSource(join(packageDir, "source.json"))).resolves.toEqual(
      pinned,
    );
    expect(existsSync(recipesPath())).toBe(false);
  });
});
