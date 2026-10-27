import itemsJson from "./generated/items.json" with { type: "json" };
import type { Item } from "./item.types.js";
import { search, searchText } from "./search.helpers.js";
import type { SearchEntry } from "./search.types.js";

const items: readonly Item[] = itemsJson;
const names = new Map(items.map(({ id, name }) => [id, name]));
const searchIndex: readonly SearchEntry[] = items
  .filter(({ crafted }) => crafted)
  .map(({ id, name }) => ({ id, text: searchText(`${name} ${id}`) }));

export function itemName(id: string): string {
  return names.get(id) ?? id;
}

export function iconUrl(id: string): string {
  return `https://render.albiononline.com/v1/item/${id}.png?quality=1&size=64`;
}

export function searchItems(query: string): string[] {
  return search(searchIndex, query);
}
