import type { Option } from "./filters.types";

// Each piece is a shop subcategory of the game files, such as "plate_helmet".
export function armorPiece(material: Option, slot: Option): Option {
  return {
    id: `${material.id}_${slot.id}`,
    label: `${material.label} ${slot.label.toLowerCase()}`,
  };
}
