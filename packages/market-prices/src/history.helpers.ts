import { parseAodpDate } from "./aodp.helpers.js";
import type { AodpHistory } from "./aodp.schema.js";
import type { HistorySummary, SummarizeOptions } from "./history.types.js";

const DAY_MS = 24 * 60 * 60_000;

export function summarizeHistory(
  series: readonly AodpHistory[],
  { days = 7 }: SummarizeOptions = {},
): HistorySummary[] {
  return series.map(({ item_id, location, quality, data }) => {
    const points = data.map((point) => ({
      ...point,
      day: parseAodpDate(point.timestamp),
    }));
    // AODP's history can lag by days, so the window ends at its newest day, not today.
    const newestDay =
      points.length === 0
        ? undefined
        : Math.max(...points.map(({ day }) => day));
    const recent =
      newestDay === undefined
        ? []
        : points.filter(({ day }) => day > newestDay - days * DAY_MS);
    const sold = recent.reduce((sum, point) => sum + point.item_count, 0);
    const earned = recent.reduce(
      (sum, point) => sum + point.item_count * point.avg_price,
      0,
    );
    return {
      itemId: item_id,
      marketId: location,
      quality,
      averagePrice: sold === 0 ? undefined : earned / sold,
      averageDailyVolume: sold / days,
      newestDay,
    };
  });
}
