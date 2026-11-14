import type { PricePoint } from "@aoc/market-prices";

import type { HistoryRange } from "./price-history.types";

const HOUR_MS = 60 * 60_000;
const DAY_MS = 24 * HOUR_MS;

const RANGE_MS: Record<HistoryRange, number> = {
  "24h": DAY_MS,
  "7d": 7 * DAY_MS,
  "30d": 30 * DAY_MS,
};

export function isHourly(range: HistoryRange): boolean {
  return range === "24h";
}

// The points in the range, which ends at the newest point: AODP's history can
// lag by hours or days.
export function inRange(
  points: readonly PricePoint[],
  range: HistoryRange,
): PricePoint[] {
  const newest = points.at(-1)?.time;
  return newest === undefined
    ? []
    : points.filter(({ time }) => time > newest - RANGE_MS[range]);
}

interface ChartPoint extends PricePoint {
  x: number;
  y: number;
  barY: number;
}

export interface ChartGeometry {
  points: ChartPoint[];
  barWidth: number;
  // Where the current price sits, if it's within the price axis.
  currentY: number | undefined;
  minPrice: number;
  maxPrice: number;
}

// Price on the left axis and volume as bars from the bottom, both scaled to
// fill `height`. The current price widens the price axis so its line shows.
export function chartGeometry(
  points: readonly PricePoint[],
  {
    width,
    height,
    current,
  }: { width: number; height: number; current?: number },
): ChartGeometry {
  const prices = points.map(({ averagePrice }) => averagePrice);
  const withCurrent = current === undefined ? prices : [...prices, current];
  const minPrice = Math.min(...withCurrent);
  const maxPrice = Math.max(...withCurrent);
  const span = maxPrice - minPrice || 1;
  const maxVolume = Math.max(1, ...points.map(({ volume }) => volume));
  const step = points.length > 1 ? width / (points.length - 1) : 0;
  const priceY = (price: number) =>
    height - ((price - minPrice) / span) * height;
  return {
    points: points.map((point, index) => ({
      ...point,
      x: points.length > 1 ? index * step : width / 2,
      y: priceY(point.averagePrice),
      barY: height - (point.volume / maxVolume) * height,
    })),
    barWidth: Math.max(1, (points.length > 1 ? step : width) * 0.6),
    currentY: current === undefined ? undefined : priceY(current),
    minPrice,
    maxPrice,
  };
}

// What a screen reader hears instead of the chart.
export function historySummary(
  points: readonly PricePoint[],
  formatPrice: (price: number) => string,
): string {
  const first = points[0];
  const last = points.at(-1);
  if (first === undefined || last === undefined) {
    return "No history";
  }
  const prices = points.map(({ averagePrice }) => averagePrice);
  const sold = points.reduce((sum, { volume }) => sum + volume, 0);
  return `Average price from ${formatPrice(first.averagePrice)} to ${formatPrice(last.averagePrice)}, between ${formatPrice(Math.min(...prices))} and ${formatPrice(Math.max(...prices))}, ${sold.toLocaleString("en")} sold`;
}
