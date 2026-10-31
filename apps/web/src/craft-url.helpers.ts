const PARAM = "item";

export function shownItemFromSearch(search: string): string | undefined {
  const itemId = new URLSearchParams(search).get(PARAM);
  return itemId === null || itemId === "" ? undefined : itemId;
}

// Keeps any other parameters.
export function searchWithShownItem(
  search: string,
  itemId: string | undefined,
): string {
  const params = new URLSearchParams(search);
  if (itemId === undefined) {
    params.delete(PARAM);
  } else {
    params.set(PARAM, itemId);
  }
  const next = params.toString();
  return next === "" ? "" : `?${next}`;
}
