import { type KeyboardEvent, useEffect, useId, useState } from "react";

import { itemName } from "@aoc/crafting-data";
import type { MarketData, PricePoint, Region } from "@aoc/market-prices";

import type { Craft } from "./best-crafts.types";
import { formatSilver } from "./format.helpers";
import { materialMarketId } from "./material-markets.helpers";
import {
  chartGeometry,
  historySummary,
  inRange,
  isHourly,
} from "./price-history.helpers";
import type { HistoryRange } from "./price-history.types";
import styles from "./PriceHistory.module.css";
import { QUALITY } from "./prices.constants";
import { marketName } from "./route.helpers";
import type { MarketChoice } from "./route.types";

const RANGES: readonly HistoryRange[] = ["24h", "7d", "30d"];

const WIDTH = 320;
const HEIGHT = 140;

type Fetched =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; points: PricePoint[] };

function formatTime(time: number, hourly: boolean): string {
  return new Date(time).toLocaleString("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    ...(hourly && { hour: "2-digit", minute: "2-digit" }),
  });
}

function Chart({
  points,
  current,
  hourly,
}: {
  points: readonly PricePoint[];
  current: number | undefined;
  hourly: boolean;
}) {
  const [active, setActive] = useState<number>();
  const summaryId = useId();
  const geometry = chartGeometry(points, {
    width: WIDTH,
    height: HEIGHT,
    ...(current !== undefined && { current }),
  });
  const shown = active === undefined ? undefined : geometry.points[active];

  // Arrow keys step through the points, Home and End jump to the ends.
  const moveWith = (event: KeyboardEvent) => {
    const last = geometry.points.length - 1;
    const at = active ?? last;
    const next =
      event.key === "ArrowLeft"
        ? Math.max(0, at - 1)
        : event.key === "ArrowRight"
          ? Math.min(last, at + 1)
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : undefined;
    if (next !== undefined) {
      event.preventDefault();
      setActive(next);
    }
  };

  return (
    <figure className={styles.figure}>
      <svg
        className={styles.chart}
        viewBox={`0 0 ${String(WIDTH)} ${String(HEIGHT)}`}
        role="img"
        aria-label="Price history"
        aria-describedby={summaryId}
        tabIndex={0}
        onKeyDown={moveWith}
        onBlur={() => {
          setActive(undefined);
        }}
        onPointerLeave={() => {
          setActive(undefined);
        }}
      >
        {geometry.points.map((point, index) => (
          <rect
            key={point.time}
            className={styles.bar}
            x={point.x - geometry.barWidth / 2}
            y={point.barY}
            width={geometry.barWidth}
            height={HEIGHT - point.barY}
            data-active={index === active}
            onPointerEnter={() => {
              setActive(index);
            }}
          />
        ))}
        {geometry.currentY !== undefined && (
          <line
            className={styles.current}
            x1={0}
            x2={WIDTH}
            y1={geometry.currentY}
            y2={geometry.currentY}
          />
        )}
        <polyline
          className={styles.line}
          points={geometry.points
            .map(({ x, y }) => `${String(x)},${String(y)}`)
            .join(" ")}
        />
        {shown && (
          <circle className={styles.dot} cx={shown.x} cy={shown.y} r={3} />
        )}
      </svg>
      <figcaption className={styles.tooltip} aria-live="polite">
        {shown ? (
          <>
            <span>{formatTime(shown.time, hourly)}</span>
            <span>{formatSilver(shown.averagePrice)}</span>
            <span>{shown.volume.toLocaleString("en")} sold</span>
          </>
        ) : (
          <>
            <span>{formatSilver(geometry.minPrice)}</span>
            <span>to {formatSilver(geometry.maxPrice)}</span>
          </>
        )}
      </figcaption>
      <p id={summaryId} className={styles.srOnly}>
        {historySummary(points, formatSilver)}
      </p>
    </figure>
  );
}

// The craft's item in the sell market, or one of its materials in the market
// it's bought in, over the last day, week or month.
export function PriceHistory({
  craft,
  marketData,
  region,
  buyMarkets,
  sellMarketId,
}: {
  craft: Craft;
  marketData: MarketData;
  region: Region;
  buyMarkets: MarketChoice;
  sellMarketId: string;
}) {
  const [chosen, setChosen] = useState<string>();
  const [range, setRange] = useState<HistoryRange>("7d");
  const itemIds = [
    craft.itemId,
    ...craft.materialCost.lines.map(({ itemId }) => itemId),
  ];
  const itemId =
    chosen !== undefined && itemIds.includes(chosen) ? chosen : craft.itemId;
  const isProduct = itemId === craft.itemId;
  const marketId = isProduct
    ? sellMarketId
    : materialMarketId(buyMarkets, itemId);
  const price = isProduct ? craft.itemPrice : craft.materialPrices.get(itemId);
  const current = price?.status === "missing" ? undefined : price?.value;
  const hourly = isHourly(range);
  const key = JSON.stringify([itemId, marketId, region, hourly]);
  const [fetched, setFetched] = useState<{ key: string; fetched: Fetched }>();

  useEffect(() => {
    let active = true;
    void marketData
      .getSeries(itemId, marketId, QUALITY, { hourly, region })
      .then(
        (points) => ({ status: "ready", points }) as const,
        () => ({ status: "error" }) as const,
      )
      .then((result) => {
        if (active) {
          setFetched({ key, fetched: result });
        }
      });
    return () => {
      active = false;
    };
  }, [marketData, itemId, marketId, region, hourly, key]);

  const shown: Fetched =
    fetched?.key === key ? fetched.fetched : { status: "loading" };
  const points = shown.status === "ready" ? inRange(shown.points, range) : [];

  return (
    <section className={styles.history} aria-label="Price history">
      <div className={styles.items} role="group" aria-label="Item">
        {itemIds.map((id) => (
          <button
            key={id}
            type="button"
            className={styles.choice}
            aria-pressed={id === itemId}
            onClick={() => {
              setChosen(id);
            }}
          >
            {itemName(id)}
          </button>
        ))}
      </div>
      <div className={styles.ranges} role="group" aria-label="Range">
        {RANGES.map((option) => (
          <button
            key={option}
            type="button"
            className={styles.choice}
            aria-pressed={option === range}
            onClick={() => {
              setRange(option);
            }}
          >
            {option}
          </button>
        ))}
        <span className={styles.market}>{marketName(marketId)}</span>
      </div>
      {shown.status === "loading" && <p className={styles.empty}>Loading…</p>}
      {shown.status === "error" && (
        <p className={styles.empty}>Couldn’t load the history</p>
      )}
      {shown.status === "ready" &&
        (points.length === 0 ? (
          <p className={styles.empty}>No history</p>
        ) : (
          <Chart points={points} current={current} hourly={hourly} />
        ))}
    </section>
  );
}
