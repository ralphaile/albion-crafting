export const SHOP_CATEGORIES = new Set([
  "weapons",
  "armors",
  "head",
  "shoes",
  "offhands",
  "bags",
  "capes",
]);

// Only the regular capes: each faction's capes, and the artifact capes made
// from them, have a subcategory of their own.
export const ONLY_SUBCATEGORIES: ReadonlyMap<
  string,
  ReadonlySet<string>
> = new Map([["capes", new Set(["accessoires_capes_capes"])]]);
