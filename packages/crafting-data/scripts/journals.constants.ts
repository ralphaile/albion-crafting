// The crafting fame each refined material gives at the item's tier, doubled
// for each enchantment level. The game files don't hold it: it's the
// community's table, which matches the fame the game shows, such as 2,160 for
// a 5.0 one-handed weapon's 24 materials.
export const FAME_PER_MATERIAL: ReadonlyMap<number, number> = new Map([
  [4, 22.5],
  [5, 90],
  [6, 270],
  [7, 645],
  [8, 1395],
]);
