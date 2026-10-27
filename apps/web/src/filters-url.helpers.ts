import { NO_FILTERS } from "./filters.constants";
import { parseFilters } from "./filters.schema";
import type { Filters } from "./filters.types";

const LIST_PARAMS = {
  tiers: "tier",
  enchants: "enchant",
  categories: "cat",
} as const;

const PARAMS = [
  ...Object.values(LIST_PARAMS),
  "artifacts",
  "profit",
  "margin",
  "complete",
  "specialty",
  "q",
];

const NUMBER = /^-?\d+$/;

function list(params: URLSearchParams, name: string) {
  const value = params.get(name);
  return value === null || value === "" ? [] : value.split(",");
}

function numbers(params: URLSearchParams, name: string) {
  return list(params, name).map(Number);
}

function whole(params: URLSearchParams, name: string) {
  const value = params.get(name);
  return value !== null && NUMBER.test(value) ? Number(value) : undefined;
}

// Undefined when the link carries no filters, so the saved ones can apply.
export function filtersFromSearch(search: string): Filters | undefined {
  const params = new URLSearchParams(search);
  if (!PARAMS.some((name) => params.has(name))) {
    return undefined;
  }
  return parseFilters({
    tiers: numbers(params, LIST_PARAMS.tiers),
    enchants: numbers(params, LIST_PARAMS.enchants),
    categories: list(params, LIST_PARAMS.categories),
    artifacts: params.get("artifacts") ?? NO_FILTERS.artifacts,
    minProfit: whole(params, "profit"),
    minMarginPercent: whole(params, "margin"),
    hideIncomplete: params.get("complete") === "1",
    specialtyOnly: params.get("specialty") === "1",
    search: params.get("q") ?? "",
  });
}

// Writes only what differs from no filter, and keeps any other parameters.
export function searchWithFilters(search: string, filters: Filters): string {
  const params = new URLSearchParams(search);
  for (const name of PARAMS) {
    params.delete(name);
  }
  for (const [key, name] of Object.entries(LIST_PARAMS)) {
    const values = filters[key as keyof typeof LIST_PARAMS];
    if (values.length > 0) {
      params.set(name, values.join(","));
    }
  }
  if (filters.artifacts !== NO_FILTERS.artifacts) {
    params.set("artifacts", filters.artifacts);
  }
  if (filters.minProfit !== undefined) {
    params.set("profit", String(filters.minProfit));
  }
  if (filters.minMarginPercent !== undefined) {
    params.set("margin", String(filters.minMarginPercent));
  }
  if (filters.hideIncomplete) {
    params.set("complete", "1");
  }
  if (filters.specialtyOnly) {
    params.set("specialty", "1");
  }
  const query = filters.search.trim();
  if (query !== "") {
    params.set("q", query);
  }
  const written = params.toString().replaceAll("%2C", ",");
  return written === "" ? "" : `?${written}`;
}
