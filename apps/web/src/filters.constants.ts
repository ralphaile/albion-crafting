import { armorPiece } from "./armor.helpers";
import type { Filters, Option } from "./filters.types";

export const NO_FILTERS: Filters = {
  tiers: [],
  enchants: [],
  categories: [],
  artifacts: "include",
  minProfit: undefined,
  minMarginPercent: undefined,
  hideIncomplete: false,
  specialtyOnly: false,
  search: "",
};

export const TIERS: readonly number[] = [4, 5, 6, 7, 8];
export const ENCHANTS: readonly number[] = [0, 1, 2, 3, 4];

export const WEAPON_TYPES: readonly Option[] = [
  { id: "arcanestaff", label: "Arcane staff" },
  { id: "axe", label: "Axe" },
  { id: "bow", label: "Bow" },
  { id: "crossbow", label: "Crossbow" },
  { id: "cursestaff", label: "Cursed staff" },
  { id: "dagger", label: "Dagger" },
  { id: "firestaff", label: "Fire staff" },
  { id: "froststaff", label: "Frost staff" },
  { id: "hammer", label: "Hammer" },
  { id: "holystaff", label: "Holy staff" },
  { id: "knuckles", label: "War gloves" },
  { id: "mace", label: "Mace" },
  { id: "naturestaff", label: "Nature staff" },
  { id: "quarterstaff", label: "Quarterstaff" },
  { id: "shapeshifterstaff", label: "Shapeshifter staff" },
  { id: "spear", label: "Spear" },
  { id: "sword", label: "Sword" },
];

export const ARMOR_MATERIALS: readonly Option[] = [
  { id: "cloth", label: "Cloth" },
  { id: "leather", label: "Leather" },
  { id: "plate", label: "Plate" },
];

export const ARMOR_SLOTS: readonly Option[] = [
  { id: "helmet", label: "Helmet" },
  { id: "armor", label: "Armor" },
  { id: "shoes", label: "Shoes" },
];

export const ARMOR_PIECES: readonly Option[] = ARMOR_MATERIALS.flatMap(
  (material) => ARMOR_SLOTS.map((slot) => armorPiece(material, slot)),
);

export const OFFHAND_TYPES: readonly Option[] = [
  { id: "booktype", label: "Tome" },
  { id: "shieldtype", label: "Shield" },
  { id: "torchtype", label: "Torch" },
];

export const CATEGORIES: readonly Option[] = [
  ...WEAPON_TYPES,
  ...ARMOR_PIECES,
  ...OFFHAND_TYPES,
];

export const MAX_SEARCH_LENGTH = 100;

export const MAX_PROFIT = 1_000_000_000;
export const MAX_MARGIN_PERCENT = 100_000;
