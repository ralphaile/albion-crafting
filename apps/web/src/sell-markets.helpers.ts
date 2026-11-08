import { revenue } from "@aoc/core";
import type { HistorySummary, ItemPrices } from "@aoc/market-prices";

import type { Craft, UsedPrice } from "./best-crafts.types";
import { withManualPrices } from "./manual-prices.helpers";
import type { ManualPrice } from "./manual-prices.types";
import { everyMaterialIn } from "./material-markets.helpers";
import { NO_PINS } from "./material-pins.constants";
import { withOutliers } from "./outliers.helpers";
import { QUALITY } from "./prices.constants";
import { sellsOnlyToBuyOrders } from "./route.helpers";
import type {
  SellMarketComparison,
  SellMarketOffer,
} from "./sell-markets.types";
import type { CraftingSettings } from "./settings.types";

const MISSING: UsedPrice = { status: "missing", origin: "api" };

// What one item costs to make with the craft's recipe, the same in every sell
// market. Unknown while a material or the station fee is.
function costPerItem(craft: Craft): number | undefined {
  const { materialCost, stationFee, silverCost } = craft;
  if (materialCost.status === "incomplete" || stationFee === undefined) {
    return undefined;
  }
  const recipe =
    craft.alternative === 0
      ? craft.recipe
      : (craft.recipe.alternatives[craft.alternative - 1] ?? craft.recipe);
  return (materialCost.total + stationFee + silverCost) / recipe.amountCrafted;
}

function netOf({ revenue: sale }: SellMarketOffer) {
  return sale.status === "missing" ? undefined : sale.net;
}

// The craft sold in each market, priced the way the table prices its own sell
// market: typed prices, staleness and outliers included.
export function compareSellMarkets(
  craft: Craft,
  marketIds: readonly string[],
  fetched: {
    prices: readonly ItemPrices[];
    history: readonly HistorySummary[];
  },
  manualPrices: readonly ManualPrice[],
  settings: CraftingSettings,
  sellMarketId: string,
  now = Date.now(),
): SellMarketComparison {
  const cost = costPerItem(craft);
  const offers = marketIds.map((marketId): SellMarketOffer => {
    const here = <Row extends { marketId: string }>(rows: readonly Row[]) =>
      rows.filter((row) => row.marketId === marketId);
    const chosen = withManualPrices(
      { materials: [], products: here(fetched.prices) },
      manualPrices,
      {
        region: settings.server,
        buyMarketId: marketId,
        materialMarkets: everyMaterialIn(marketId),
        pins: NO_PINS,
        sellMarketId: marketId,
        quality: QUALITY,
        staleAfterMinutes: settings.staleAfterHours * 60,
        manualStaleAfterMinutes: settings.manualStaleAfterDays * 24 * 60,
        preferManual: settings.preferManualPrices,
      },
      now,
    );
    const [prices] = withOutliers(
      chosen,
      { materials: [], products: here(fetched.history) },
      {
        ratio: settings.outlierRatio,
        useAverage: settings.useAverageForOutliers,
      },
    ).products.filter(({ itemId }) => itemId === craft.itemId);
    const sale = revenue(prices, {
      sellMode: sellsOnlyToBuyOrders(marketId)
        ? "blackMarket"
        : settings.sellMode,
      premium: settings.premium,
    });
    return {
      marketId,
      price: prices?.[sale.source] ?? MISSING,
      revenue: sale,
      profit:
        sale.status === "missing" || cost === undefined
          ? undefined
          : sale.net - cost,
    };
  });
  const sorted = offers.toSorted((a, b) => {
    const [netA, netB] = [netOf(a), netOf(b)];
    if (netA === undefined || netB === undefined) {
      return Number(netA === undefined) - Number(netB === undefined);
    }
    return netB - netA;
  });
  const [first] = sorted;
  const best = first && netOf(first) !== undefined ? first : undefined;
  const current = offers.find(({ marketId }) => marketId === sellMarketId);
  const [bestNet, currentNet] = [
    best && netOf(best),
    current && netOf(current),
  ];
  return {
    offers: sorted,
    best,
    current,
    gain:
      best === current || bestNet === undefined || currentNet === undefined
        ? undefined
        : bestNet - currentNet,
  };
}
