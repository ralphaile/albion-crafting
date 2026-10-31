import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { recipes } from "@aoc/crafting-data";

import { sameManualPrice } from "./manual-prices.helpers";
import type { ManualPrice } from "./manual-prices.types";
import type { MissingPrice } from "./missing-prices.types";
import { MissingPricesPanel } from "./MissingPricesPanel";

const ARTHURS_REST = "Arthurs Rest Smugglers Network";

function missing(
  itemId: string,
  craftCount: number,
  marketId = ARTHURS_REST,
): MissingPrice {
  return {
    key: { region: "west", itemId, marketId, quality: 1, source: "sellMin" },
    craftCount,
  };
}

const swords = [
  missing("T4_METALBAR", 3, "Lymhurst"),
  missing("T4_MAIN_SWORD", 1),
  missing("T4_2H_CLAYMORE", 1),
];

const broadsword = "Adept's Broadsword 4.0, sell order in Arthur's Rest";
const claymore = "Adept's Claymore 4.0, sell order in Arthur's Rest";
const steelBar = "Steel Bar 4.0, sell order in Lymhurst";

// Saving a price takes it off the list, as it does in the app.
function Worklist({
  initial,
  onSave,
}: {
  initial: readonly MissingPrice[];
  onSave: (price: ManualPrice) => void;
}) {
  const [missingPrices, setMissingPrices] = useState(initial);
  return (
    <MissingPricesPanel
      missingPrices={missingPrices}
      onSave={(price) => {
        onSave(price);
        setMissingPrices((current) =>
          current.filter(({ key }) => !sameManualPrice(key, price)),
        );
      }}
      onRemove={() => undefined}
    />
  );
}

function openWorklist(initial: readonly MissingPrice[] = swords) {
  const onSave = vi.fn<(price: ManualPrice) => void>();
  render(<Worklist initial={initial} onSave={onSave} />);
  fireEvent.click(screen.getByRole("button", { name: /missing$/ }));
  return onSave;
}

function panel() {
  return screen.getByRole("dialog", { name: "Missing prices" });
}

function field(name: string) {
  return within(panel()).getByRole("textbox", { name });
}

function fields() {
  return within(panel())
    .queryAllByRole("textbox")
    .map((input) => input.getAttribute("aria-label"));
}

function type(name: string, text: string) {
  fireEvent.change(field(name), { target: { value: text } });
  fireEvent.keyDown(field(name), { key: "Enter" });
}

describe("MissingPricesPanel", () => {
  it("says on its button how many prices are missing, and hides it when none are", () => {
    const panelFor = (missingPrices: readonly MissingPrice[]) => (
      <MissingPricesPanel
        missingPrices={missingPrices}
        onSave={() => undefined}
        onRemove={() => undefined}
      />
    );
    const { rerender } = render(panelFor(swords));
    expect(
      screen.getByRole("button", { name: "3 prices missing" }),
    ).toBeInTheDocument();

    rerender(panelFor(swords.slice(0, 1)));
    expect(
      screen.getByRole("button", { name: "1 price missing" }),
    ).toBeInTheDocument();

    rerender(panelFor([]));
    expect(
      screen.queryByRole("button", { name: /missing$/ }),
    ).not.toBeInTheDocument();
  });

  it("lists each price with its order, market and how many crafts need it", () => {
    openWorklist();

    expect(fields()).toEqual([steelBar, broadsword, claymore]);
    expect(field(steelBar)).toHaveAccessibleDescription(
      "Sell order · Lymhurst · for 3 crafts",
    );
    expect(field(broadsword)).toHaveAccessibleDescription(
      "Sell order · Arthur's Rest · for 1 craft",
    );
  });

  it("saves a price on Enter and moves to the next one", () => {
    const onSave = openWorklist();
    field(broadsword).focus();

    type(broadsword, "6000");

    expect(onSave).toHaveBeenCalledWith({
      ...swords[1]?.key,
      value: 6000,
      enteredAt: expect.any(Number) as number,
    });
    expect(fields()).toEqual([steelBar, claymore]);
    expect(field(claymore)).toHaveFocus();
  });

  it("moves to the one before after the last price", () => {
    openWorklist();
    field(claymore).focus();

    type(claymore, "9000");

    expect(fields()).toEqual([steelBar, broadsword]);
    expect(field(broadsword)).toHaveFocus();
  });

  it("saves a price when Tab leaves it", () => {
    const onSave = openWorklist();

    fireEvent.change(field(steelBar), { target: { value: "100" } });
    fireEvent.blur(field(steelBar));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(fields()).toEqual([broadsword, claymore]);
  });

  it("keeps a price that isn't whole silver, and says why", () => {
    const onSave = openWorklist();
    field(broadsword).focus();

    type(broadsword, "1.5k");

    expect(onSave).not.toHaveBeenCalled();
    expect(field(broadsword)).toHaveFocus();
    expect(field(broadsword)).toHaveAccessibleDescription(
      /Whole silver above 0, like 1500/,
    );
  });

  it("says so once every price is in", () => {
    openWorklist(swords.slice(0, 1));

    type(steelBar, "100");

    expect(within(panel()).getByText("No prices missing")).toBeInTheDocument();
  });

  it("searches the materials and the items by name", () => {
    openWorklist();
    const search = within(panel()).getByRole("searchbox", {
      name: "Search missing prices",
    });

    fireEvent.change(search, { target: { value: "steel bar" } });
    expect(fields()).toEqual([steelBar]);

    fireEvent.change(search, { target: { value: "adept's" } });
    expect(fields()).toEqual([broadsword, claymore]);

    fireEvent.change(search, { target: { value: "bow" } });
    expect(fields()).toEqual([]);
    expect(
      within(panel()).getByText("No missing prices match"),
    ).toBeInTheDocument();
  });

  it("shows 50 prices a page", () => {
    const many = recipes.slice(0, 51).map(({ itemId }) => missing(itemId, 1));
    openWorklist(many);

    expect(fields()).toHaveLength(50);
    expect(within(panel()).getByText("Prices 1–50 of 51")).toBeInTheDocument();

    fireEvent.click(within(panel()).getByRole("button", { name: "Page 2" }));

    expect(fields()).toHaveLength(1);
    expect(within(panel()).getAllByRole("textbox")[0]).toHaveFocus();
  });
});
