export interface CraftingLocation {
  id: string;
  name: string;
  craftingBonus: number;
  specialties: Record<string, number>;
}
