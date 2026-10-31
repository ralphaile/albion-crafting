import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import type { ItemPrices, MarketData } from "@aoc/market-prices";

import { BestCrafts } from "./BestCrafts";
import { NO_FILTERS } from "./filters.constants";
import type { Filters } from "./filters.types";
import { memoryManualPriceStore } from "./manual-prices.store";
import type { ManualPrice, ManualPriceStore } from "./manual-prices.types";
import { DEFAULT_ROUTE } from "./route.constants";
import { placeFromChoice } from "./route.helpers";
import type { Route } from "./route.types";
import { DEFAULT_SETTINGS } from "./settings.constants";
import { NO_SPECIALIZATIONS } from "./specializations.constants";
import type { SpecializationProfile } from "./specializations.types";
import { useBestCrafts } from "./useBestCrafts";
import { useManualPrices } from "./useManualPrices";
import { fakeMarketData } from "../test/fake-market-data";

const lymhurst: Route = {
  place: DEFAULT_ROUTE.place,
  buyMarketId: "Martlock",
  sellMarketId: "Caerleon",
};

const forestHideout: Route = {
  ...lymhurst,
  place: placeFromChoice({
    kind: "hideout",
    biomeId: "FOREST",
    quality: 6,
    level: 9,
  }),
};

const broadswordOnly = {
  ...NO_FILTERS,
  tiers: [4],
  enchants: [0],
  search: "broadsword",
};

function priced(itemId: string, marketId: string, value: number): ItemPrices {
  return {
    itemId,
    marketId,
    quality: 1,
    sellMin: { status: "fresh", value, observedAt: 0, ageMinutes: 30 },
    buyMax: { status: "missing" },
  };
}

const typedLeather: ManualPrice = {
  region: "west",
  itemId: "T4_LEATHER",
  marketId: "Martlock",
  quality: 1,
  source: "sellMin",
  value: 50,
  enteredAt: Date.now(),
};

function Crafts({
  marketData,
  store,
  initial,
  route,
  filters,
  specializations,
  onEditSpecializations,
}: {
  marketData: MarketData;
  store: ManualPriceStore;
  initial: readonly ManualPrice[];
  route: Route;
  filters: Filters;
  specializations: SpecializationProfile;
  onEditSpecializations: (treeId: string) => void;
}) {
  const { manualPrices, saveManualPrice, removeManualPrice } = useManualPrices(
    store,
    initial,
  );
  const [shownItemId, setShownItemId] = useState<string>();
  const bestCrafts = useBestCrafts(
    marketData,
    route,
    DEFAULT_SETTINGS,
    filters,
    manualPrices,
    specializations,
  );
  return (
    <BestCrafts
      bestCrafts={bestCrafts}
      shownItemId={shownItemId}
      onShowItem={setShownItemId}
      route={route}
      settings={DEFAULT_SETTINGS}
      filters={filters}
      manualPrices={manualPrices}
      onSaveManualPrice={saveManualPrice}
      onRemoveManualPrice={removeManualPrice}
      specializations={specializations}
      onEditSpecializations={onEditSpecializations}
    />
  );
}

function renderCrafts({
  filters,
  materials,
  products,
  initial = [],
  route = lymhurst,
  specializations = NO_SPECIALIZATIONS,
}: {
  filters: Filters;
  materials: ItemPrices[];
  products: ItemPrices[];
  initial?: readonly ManualPrice[];
  route?: Route;
  specializations?: SpecializationProfile;
}) {
  const getPrices = vi.fn<MarketData["getPrices"]>((_itemIds, marketIds) =>
    Promise.resolve({
      prices: marketIds[0] === "Martlock" ? materials : products,
      failures: [],
      fetchedAt: 0,
    }),
  );
  const store = memoryManualPriceStore();
  const onEditSpecializations = vi.fn<(treeId: string) => void>();
  render(
    <Crafts
      marketData={fakeMarketData({ getPrices })}
      store={store}
      initial={initial}
      route={route}
      filters={filters}
      specializations={specializations}
      onEditSpecializations={onEditSpecializations}
    />,
  );
  return { getPrices, store, onEditSpecializations };
}

// The broadsword's leather has no price at Martlock.
function renderBroadsword(
  initial: readonly ManualPrice[] = [],
  route = lymhurst,
  specializations: SpecializationProfile = NO_SPECIALIZATIONS,
) {
  return renderCrafts({
    filters: broadswordOnly,
    materials: [priced("T4_METALBAR", "Martlock", 100)],
    products: [priced("T4_MAIN_SWORD", "Caerleon", 5000)],
    initial,
    route,
    specializations,
  });
}

function panel(name = "Adept's Broadsword 4.0") {
  return screen.getByRole("dialog", { name });
}

function field(name: string) {
  return within(panel()).getByRole("textbox", { name });
}

const leather = "Worked Leather 4.0, sell order in Martlock";

async function openFromMissingPrices() {
  fireEvent.click(
    await screen.findByRole("button", { name: "1 price missing" }),
  );
}

function figures(section: string, name?: string) {
  const region = within(panel(name)).getByRole("region", { name: section });
  return Object.fromEntries(
    within(region)
      .getAllByRole("term")
      .map((term) => [term.textContent, term.nextElementSibling?.textContent]),
  );
}

function detailOf(name: string) {
  return field(name).closest("li")?.lastElementChild?.textContent;
}

function type(name: string, text: string, key = "Enter") {
  fireEvent.change(field(name), { target: { value: text } });
  fireEvent.keyDown(field(name), { key });
}

describe("CraftPanel", () => {
  it("lists each material's buy price and the item's sell price", async () => {
    renderBroadsword();
    await openFromMissingPrices();

    expect(
      within(panel())
        .getAllByRole("textbox")
        .map((input) => input.getAttribute("aria-label")),
    ).toEqual([
      "Steel Bar 4.0, sell order in Martlock",
      leather,
      "Adept's Broadsword 4.0, sell order in Caerleon",
    ]);
    expect(field("Steel Bar 4.0, sell order in Martlock")).toHaveAttribute(
      "placeholder",
      "100",
    );
    expect(
      field("Steel Bar 4.0, sell order in Martlock"),
    ).toHaveAccessibleDescription("Sell order · Martlock · seen 30 min ago");
    expect(field(leather)).toHaveAccessibleDescription(
      "Sell order · Martlock · missing",
    );
  });

  // Lymhurst's 18% and its 15% sword specialty, with focus, return 47.92% of
  // the bars and leather.
  it("breaks the craft down into materials, costs, revenue and result", async () => {
    renderBroadsword([typedLeather]);
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Prices for Adept's Broadsword 4.0",
      }),
    );

    expect(detailOf("Steel Bar 4.0, sell order in Martlock")).toBe(
      "8.33 × 100 = 833",
    );
    expect(detailOf(leather)).toBe("4.17 × 50 = 208");
    expect(figures("Return rate")).toEqual({
      Base: "18.0%",
      Specialty: "15.0%",
      "Daily bonus": "0.0%",
      Focus: "59.0%",
      "Production bonus": "92.0%",
      "Return rate": "47.92%",
    });
    expect(figures("Costs")).toEqual({
      Materials: "1,042",
      "Station fee": "216",
      Silver: "0",
      Total: "1,258",
    });
    expect(figures("Revenue")).toEqual({
      Tax: "−200",
      "Setup fee": "−125",
      Net: "4,675",
    });
    expect(figures("Focus")).toEqual({
      "Mastery 0 × 30": "0",
      "Broadsword 0 × 250": "0",
      "Other specializations 0 × 30": "0",
      FCE: "0",
      "Base focus": "1,286",
      Focus: "1,286",
    });
    expect(figures("Result")).toEqual({
      Profit: "3,417",
      Margin: "271.7%",
      "Silver per focus": "0.4",
    });
  });

  it("builds a hideout's return rate from its map quality and power level", async () => {
    renderBroadsword([typedLeather], forestHideout);
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Prices for Adept's Broadsword 4.0",
      }),
    );

    expect(figures("Return rate")).toEqual({
      "Map quality": "26.0%",
      "Power level": "26.0%",
      "Power specialist": "30.0%",
      "Daily bonus": "0.0%",
      Focus: "59.0%",
      "Production bonus": "141.0%",
      "Return rate": "58.51%",
    });
    expect(detailOf(leather)).toBe("3.32 × 50 = 166");
  });

  // 29,200 FCE makes the 1,286 base focus 1,286 × 0.5 ^ 2.92 = 169.92.
  it("shows how the craft's FCE is worked out from the specializations", async () => {
    renderBroadsword([typedLeather], lymhurst, {
      sword: {
        mastery: 100,
        specializations: { MAIN_SWORD: 100, "2H_CLAYMORE": 40 },
      },
    });
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Prices for Adept's Broadsword 4.0",
      }),
    );

    expect(figures("Focus")).toEqual({
      "Mastery 100 × 30": "3,000",
      "Broadsword 100 × 250": "25,000",
      "Other specializations 40 × 30": "1,200",
      FCE: "29,200",
      "Base focus": "1,286",
      Focus: "170",
    });
    expect(
      within(panel()).queryByRole("button", {
        name: "Fill in specializations",
      }),
    ).not.toBeInTheDocument();
  });

  it("offers to fill in the specializations of a craft with no FCE", async () => {
    const { onEditSpecializations } = renderBroadsword([typedLeather]);
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Prices for Adept's Broadsword 4.0",
      }),
    );

    fireEvent.click(
      within(panel()).getByRole("button", { name: "Fill in specializations" }),
    );

    expect(onEditSpecializations).toHaveBeenCalledWith("sword");
  });

  it("leaves the focus breakdown out of a royal item, which costs none", async () => {
    renderCrafts({
      filters: {
        ...NO_FILTERS,
        tiers: [4],
        enchants: [0],
        search: "royal robe",
      },
      materials: [],
      products: [priced("T4_ARMOR_CLOTH_ROYAL", "Caerleon", 5000)],
      specializations: {
        cloth_armor: {
          mastery: 100,
          specializations: { ARMOR_CLOTH_SET1: 100 },
        },
      },
    });
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Prices for Adept's Royal Robe 4.0",
      }),
    );

    const robe = "Adept's Royal Robe 4.0";
    expect(
      within(panel(robe)).queryByRole("region", { name: "Focus" }),
    ).not.toBeInTheDocument();
    expect(
      within(panel(robe)).queryByRole("button", {
        name: "Fill in specializations",
      }),
    ).not.toBeInTheDocument();
    expect(figures("Result", robe)).not.toHaveProperty("Silver per focus");
  });

  it("leaves out what a missing price keeps from being worked out", async () => {
    renderBroadsword();
    await openFromMissingPrices();

    expect(detailOf(leather)).toBe("4.17 × —");
    expect(figures("Costs")).toMatchObject({ Materials: "—", Total: "—" });
    expect(figures("Revenue")).toMatchObject({ Net: "4,675" });
    expect(figures("Result")).toMatchObject({ Profit: "—", Margin: "—" });
  });

  it("saves a typed price on Enter, and prices the craft without asking AODP again", async () => {
    const { getPrices, store } = renderBroadsword();
    await openFromMissingPrices();

    type(leather, "50");

    expect(
      screen.queryByRole("button", { name: "1 price missing" }),
    ).not.toBeInTheDocument();
    expect(field(leather)).toHaveValue("50");
    expect(field(leather)).toHaveAccessibleDescription(
      "Sell order · Martlock · typed just now",
    );
    await expect(store.list()).resolves.toEqual([
      { ...typedLeather, enteredAt: expect.any(Number) as number },
    ]);
    expect(getPrices).toHaveBeenCalledTimes(2);
  });

  it("saves a typed price on leaving the field", async () => {
    const { store } = renderBroadsword();
    await openFromMissingPrices();

    fireEvent.change(field(leather), { target: { value: "60" } });
    fireEvent.blur(field(leather));

    await expect(store.list()).resolves.toMatchObject([{ value: 60 }]);
  });

  it.each(["12.5k", "1e3", "0", "-5", "12.5"])(
    "refuses %j and says what it needs",
    async (text) => {
      const { store } = renderBroadsword();
      await openFromMissingPrices();

      type(leather, text);

      expect(field(leather)).toBeInvalid();
      expect(field(leather)).toHaveAccessibleDescription(
        "Sell order · Martlock · missing Whole silver above 0, like 1500",
      );
      await expect(store.list()).resolves.toEqual([]);
    },
  );

  it("cancels the typing on Escape, and keeps the panel open", async () => {
    const { store } = renderBroadsword([typedLeather]);
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Prices for Adept's Broadsword 4.0",
      }),
    );

    type(leather, "70", "Escape");

    expect(field(leather)).toHaveValue("50");
    expect(panel()).toBeInTheDocument();
    await expect(store.list()).resolves.toEqual([]);
  });

  it("removes a manual price when its field is emptied", async () => {
    const { store } = renderBroadsword([typedLeather]);
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Prices for Adept's Broadsword 4.0",
      }),
    );

    type(leather, "");

    expect(field(leather)).toHaveAccessibleDescription(
      "Sell order · Martlock · missing",
    );
    expect(
      screen.getByRole("button", { name: "1 price missing" }),
    ).toBeInTheDocument();
    await expect(store.list()).resolves.toEqual([]);
  });

  it("closes with its close button", async () => {
    renderBroadsword();
    await openFromMissingPrices();

    fireEvent.click(screen.getByRole("button", { name: "Close details" }));

    expect(
      screen.queryByRole("dialog", { name: "Adept's Broadsword 4.0" }),
    ).not.toBeInTheDocument();
  });

  // A Mistcaller takes either its Runed Horn or a token, with the same planks and cloth.
  describe("for an item with two recipes", () => {
    const horn = "Adept's Mistcaller 4.0";
    const token = "Adept's Crystallized Spirit 4.0, sell order in Martlock";

    async function openHorn() {
      renderCrafts({
        filters: { ...broadswordOnly, search: "mistcaller" },
        materials: [
          priced("T4_PLANKS", "Martlock", 100),
          priced("T4_CLOTH", "Martlock", 100),
          priced("T4_ARTEFACT_OFF_HORN_KEEPER", "Martlock", 2000),
        ],
        products: [priced("T4_OFF_HORN_KEEPER", "Caerleon", 9000)],
      });
      fireEvent.click(
        await screen.findByRole("button", { name: `Prices for ${horn}` }),
      );
    }

    function recipe(name: RegExp) {
      const region = within(panel(horn)).getByRole("region", {
        name: "Recipe",
      });
      return within(region).getByRole("button", { name });
    }

    it("shows the recipe the table uses, and what the other one lacks", async () => {
      await openHorn();

      expect(recipe(/Runed Horn/)).toHaveAttribute("aria-pressed", "true");
      expect(recipe(/Runed Horn/)).toHaveAccessibleName(/Used in the table$/);
      expect(recipe(/Crystallized Spirit/)).toHaveTextContent(
        "Adept's Crystallized Spirit 4.01 price missing",
      );
      expect(
        within(panel(horn)).queryByRole("textbox", { name: token }),
      ).not.toBeInTheDocument();
    });

    it("shows the other recipe's prices to type, and the table switches once it's cheaper", async () => {
      await openHorn();

      fireEvent.click(recipe(/Crystallized Spirit/));
      expect(recipe(/Crystallized Spirit/)).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      fireEvent.change(
        within(panel(horn)).getByRole("textbox", { name: token }),
        {
          target: { value: "500" },
        },
      );
      fireEvent.keyDown(
        within(panel(horn)).getByRole("textbox", { name: token }),
        {
          key: "Enter",
        },
      );

      expect(recipe(/Crystallized Spirit/)).toHaveAccessibleName(
        /Used in the table$/,
      );
      expect(recipe(/Runed Horn/)).not.toHaveAccessibleName(/Used/);
    });

    it("opens again on the recipe the table uses", async () => {
      await openHorn();
      fireEvent.click(recipe(/Crystallized Spirit/));

      fireEvent.click(screen.getByRole("button", { name: "Close details" }));
      fireEvent.click(
        screen.getByRole("button", { name: `Prices for ${horn}` }),
      );

      expect(recipe(/Runed Horn/)).toHaveAttribute("aria-pressed", "true");
    });
  });
});
