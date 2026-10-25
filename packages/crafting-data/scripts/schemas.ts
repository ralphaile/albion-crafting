import { z } from "zod";

import type { FILES } from "./download.ts";

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
  craftingrequirements: oneOrMany(craftingRequirements).optional(),
  enchantments: z
    .object({
      enchantment: oneOrMany(
        z.object({
          "@enchantmentlevel": number,
          craftingrequirements: oneOrMany(craftingRequirements),
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
});

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
