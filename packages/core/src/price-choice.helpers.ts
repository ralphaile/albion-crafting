import type {
  DatedPrice,
  PriceChoiceOptions,
  PriceOrigin,
} from "./price-choice.types.js";

export function choosePrice(
  api: DatedPrice | { status: "missing" },
  manual: DatedPrice | undefined,
  { preferManual }: PriceChoiceOptions,
): PriceOrigin {
  if (manual === undefined) {
    return "api";
  }
  if (preferManual || api.status === "missing") {
    return "manual";
  }
  if (api.status !== manual.status) {
    return manual.status === "fresh" ? "manual" : "api";
  }
  return manual.observedAt > api.observedAt ? "manual" : "api";
}
