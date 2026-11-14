export const SHOP_CATEGORIES = new Set([
  "weapons",
  "armors",
  "head",
  "shoes",
  "offhands",
  "bags",
  "capes",
]);

// Vanity capes and arena banners: the faction capes each have a subcategory
// of their own, such as accessoires_capes_martlock.
export const SKIPPED_SUBCATEGORIES: ReadonlyMap<
  string,
  ReadonlySet<string>
> = new Map([["capes", new Set(["other"])]]);
