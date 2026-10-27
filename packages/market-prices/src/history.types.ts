export interface HistorySummary {
  itemId: string;
  marketId: string;
  quality: number;
  averagePrice: number | undefined;
  averageDailyVolume: number;
  newestDay: number | undefined;
}

export interface SummarizeOptions {
  days?: number;
}
