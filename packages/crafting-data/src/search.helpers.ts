import type { SearchEntry } from "./search.types.js";

export function searchText(text: string): string {
  return text.toLowerCase().replace(/['’]/g, "");
}

export function search(index: readonly SearchEntry[], query: string): string[] {
  const words = searchText(query)
    .split(/\s+/)
    .filter((word) => word !== "");
  if (words.length === 0) {
    return [];
  }
  return index
    .filter(({ text }) => words.every((word) => text.includes(word)))
    .map(({ id }) => id);
}
