import { z } from "zod";

import type { FILES } from "./download.constants.ts";

const number = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/, "expected a number")
  .transform(Number);

const boolean = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

const mapQuality = z
  .string()
  .regex(/^Q\d+$/, "expected Q and a number")
  .transform((quality) => Number(quality.slice(1)));

function oneOrMany<T extends z.ZodType>(schema: T) {
  return z.preprocess(
    (value) => (value === undefined || Array.isArray(value) ? value : [value]),
    z.array(schema),
  );
}

const craftingRequirements = z.object({
  "@silver": number.optional(),
  "@craftingfocus": number,
  "@amountcrafted": number.optional(),
  craftresource: oneOrMany(
    z.object({
      "@uniquename": z.string(),
      "@count": number,
      "@maxreturnamount": number.optional(),
      "@enchantmentlevel": number.optional(),
      "@preservequality": boolean.optional(),
    }),
  ).optional(),
});

const gearItem = z.object({
  "@uniquename": z.string(),
  "@tier": number,
  "@shopcategory": z.string(),
  "@shopsubcategory1": z.string(),
  "@craftingcategory": z.string().optional(),
  "@showinmarketplace": boolean.optional(),
  "@destinyandjournalcraftfamefactor": number.optional(),
  craftingrequirements: oneOrMany(craftingRequirements).optional(),
  enchantments: z
    .object({
      enchantment: oneOrMany(
        z.object({
          "@enchantmentlevel": number,
          craftingrequirements: oneOrMany(craftingRequirements),
          upgraderequirements: z
            .object({
              upgraderesource: z.object({
                "@uniquename": z.string(),
                "@count": number,
              }),
            })
            .optional(),
        }),
      ),
    })
    .optional(),
});

const simpleItem = z.object({
  "@uniquename": z.string(),
  "@tier": number,
  "@enchantmentlevel": number.optional(),
  "@itemvalue": number.optional(),
  "@shopcategory": z.string().optional(),
  "@shopsubcategory1": z.string().optional(),
  "@shopsubcategory2": z.string().optional(),
  "@craftingcategory": z.string().optional(),
  // Some, such as journals, are made without focus.
  craftingrequirements: oneOrMany(
    craftingRequirements.extend({ "@craftingfocus": number.optional() }),
  ).optional(),
});

// A crafting laborer's journal names the items whose crafting fame fills it.
// The gatherers' journals fill from gathering, so they have no craftitemfame.
const journalItem = z.object({
  "@uniquename": z.string(),
  "@tier": number,
  "@maxfame": number,
  famefillingmissions: z
    .object({
      craftitemfame: z
        .object({ validitem: oneOrMany(z.object({ "@id": z.string() })) })
        .optional(),
    })
    .optional(),
});

// Only the food and potions are read: fish, fish sauce, event items and
// unreleased ones in the same list don't fit a recipe.
function isCraftedConsumable(entry: unknown): boolean {
  if (typeof entry !== "object" || entry === null) {
    return false;
  }
  const item = entry as Record<string, unknown>;
  const id = item["@uniquename"];
  return (
    typeof id === "string" &&
    !id.startsWith("UNIQUE_") &&
    item["@shopcategory"] === "consumables" &&
    (item["@shopsubcategory1"] === "food" ||
      item["@shopsubcategory1"] === "potions") &&
    item["@craftingcategory"] !== undefined
  );
}

const bonus = z.object({
  "@value": number,
  "@islandvalue": number.optional(),
});

const craftingLocation = z
  .object({
    "@clusterid": z.string().optional(),
    "@biome": z.string().optional(),
    "@clusterquality": mapQuality.optional(),
    craftingbonus: bonus.extend({ "@islandvalue": number }).optional(),
    refiningbonus: bonus,
    craftingmodifier: oneOrMany(
      z.object({ "@name": z.string(), "@value": number }),
    ),
  })
  .refine(
    (location) =>
      location["@clusterid"] !== undefined ||
      (location["@biome"] !== undefined &&
        location["@clusterquality"] !== undefined),
    "expected @clusterid, or @biome and @clusterquality",
  );

const powerLevel = z.object({
  "@level": number,
  "@generalistcraftingbonus": number.optional(),
  "@specialistcraftingbonus": number.optional(),
});

export const dumpSchemas = {
  "items.json": z.object({
    items: z
      .object({
        weapon: z.array(gearItem),
        equipmentitem: z.array(gearItem),
        transformationweapon: z.array(gearItem),
        simpleitem: z.array(simpleItem),
        consumableitem: z.preprocess(
          (entries: unknown): unknown[] =>
            Array.isArray(entries)
              ? (entries as unknown[]).filter(isCraftedConsumable)
              : [],
          z.array(gearItem),
        ),
        journalitem: z.array(journalItem),
      })
      .catchall(z.unknown()),
  }),
  "formatted/items.json": z.array(
    z.object({
      UniqueName: z.string(),
      LocalizedNames: z.object({ "EN-US": z.string() }).nullable(),
    }),
  ),
  "formatted/world.json": z.array(
    z.object({ Index: z.string(), UniqueName: z.string() }),
  ),
  "craftingmodifiers.json": z.object({
    craftingmodifiers: z.object({
      refiningcategory: z.object({
        item: oneOrMany(z.object({ "@category": z.string() })),
      }),
      craftinglocation: oneOrMany(craftingLocation),
    }),
  }),
  "hideouts.json": z.object({
    hideouts: z.object({
      hideout: z.object({
        powerlevels: z.object({ powerlevel: oneOrMany(powerLevel) }),
      }),
    }),
  }),
} satisfies Record<(typeof FILES)[number], z.ZodType>;
