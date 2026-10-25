import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ItemSearch } from "./ItemSearch";

function searchFor(query: string) {
  render(<ItemSearch />);
  fireEvent.change(screen.getByRole("searchbox", { name: "Search items" }), {
    target: { value: query },
  });
}

function matchingItems() {
  return within(screen.getByRole("list", { name: "Matching items" }))
    .getAllByRole("listitem")
    .map((item) => item.textContent.trim());
}

describe("ItemSearch", () => {
  it("shows nothing before you type", () => {
    render(<ItemSearch />);

    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("lists the matching items by name with tier.enchant", () => {
    searchFor("expert broadsword");

    expect(matchingItems()).toEqual([
      "Expert's Broadsword 5.0",
      "Expert's Broadsword 5.1",
      "Expert's Broadsword 5.2",
      "Expert's Broadsword 5.3",
      "Expert's Broadsword 5.4",
    ]);
  });

  it("shows each item's icon", () => {
    searchFor("broadsword 5.1");

    expect(screen.getByRole("presentation")).toHaveAttribute(
      "src",
      "https://render.albiononline.com/v1/item/T5_MAIN_SWORD@1.png?quality=1&size=64",
    );
  });

  it("says so when nothing matches", () => {
    searchFor("excalibur");

    expect(screen.getByText("No items match “excalibur”.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("shows the first 50 matches and how many there are", () => {
    searchFor("sword");

    expect(matchingItems()).toHaveLength(50);
    expect(
      screen.getByText(
        /^Showing the first 50 of \d+ matches\. Type more to narrow them down\.$/,
      ),
    ).toBeInTheDocument();
  });
});
