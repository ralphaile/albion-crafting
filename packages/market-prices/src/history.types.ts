export interface HistorySummary {
  itemId: string;
  marketId: string;
  quality: number;
  averagePrice: number | undefined;
  averageDailyVolume: number;
  newestDay: number | undefined;
}

// One hour or day of a price history: when it starts, the average price
// sold at, and how many sold.
export interface PricePoint {
  time: number;
  averagePrice: number;
  volume: number;
}

export interface SummarizeOptions {
  days?: number;
}
