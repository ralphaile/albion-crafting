import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { CraftingLocationBar } from "./CraftingLocationBar";
import { DEFAULT_ROUTE_CHOICE } from "./route.constants";
import type { PlaceChoice, RouteChoice } from "./route.types";

function Bar({
  initial,
  onChange,
}: {
  initial: RouteChoice;
  onChange: (route: RouteChoice) => void;
}) {
  const [route, setRoute] = useState(initial);
  return (
    <CraftingLocationBar
      route={route}
      onChange={(next) => {
        setRoute(next);
        onChange(next);
      }}
    />
  );
}

function renderBar(place: PlaceChoice = DEFAULT_ROUTE_CHOICE.place) {
  const changes: RouteChoice[] = [];
  render(
    <Bar
      initial={{ ...DEFAULT_ROUTE_CHOICE, place }}
      onChange={(route) => {
        changes.push(route);
      }}
    />,
  );
  return () => changes.at(-1);
}

function select(name: string) {
  return screen.getByRole("combobox", { name });
}

function choose(name: string, value: string) {
  fireEvent.change(select(name), { target: { value } });
}

function options(element: HTMLElement) {
  return within(element)
    .getAllByRole("option")
    .map((option) => option.textContent);
}

function groups(name: string) {
  return within(select(name))
    .getAllByRole("group")
    .map((group) => [group.getAttribute("label"), options(group)]);
}

function preview() {
  return within(
    screen.getByRole("table", { name: "Production bonus and return rate" }),
  )
    .getAllByRole("row")
    .slice(2)
    .map((row) => row.textContent);
}

const ROYAL_CITIES = [
  "Royal cities",
  ["Thetford", "Lymhurst", "Bridgewatch", "Martlock", "Fort Sterling"],
];
const CAERLEON_AND_BRECILIEN = [
  "Caerleon and Brecilien",
  ["Caerleon", "Brecilien"],
];

describe("CraftingLocationBar", () => {
  it("lists a hideout, then every crafting location in its group", () => {
    renderBar();

    expect(options(select("Crafting location"))[0]).toBe("Hideout");
    expect(groups("Crafting location")).toEqual([
      ROYAL_CITIES,
      CAERLEON_AND_BRECILIEN,
      ["Rests", ["Arthur's Rest", "Merlyn's Rest", "Morgana's Rest"]],
      ["Islands", ["Island"]],
    ]);
  });

  it("crafts at the location you pick, and previews its bonus", () => {
    const latest = renderBar();

    expect(preview()).toEqual([
      "Base18%15.25%77%43.50%",
      "Specialty33%24.81%92%47.92%",
    ]);

    choose("Crafting location", "4300");

    expect(latest()?.place).toEqual({ kind: "location", locationId: "4300" });
    expect(screen.queryByRole("combobox", { name: "Biome" })).toBeNull();
  });

  it("says the island has no specialties", () => {
    renderBar({ kind: "location", locationId: "island" });

    expect(preview()).toEqual([
      "Base0%0.00%59%37.11%",
      "SpecialtyNo specialties",
    ]);
  });

  it("lists the biomes, map qualities and power levels of a hideout", () => {
    renderBar();

    choose("Crafting location", "hideout");

    expect(options(select("Biome"))).toEqual([
      "Swamp",
      "Forest",
      "Steppe",
      "Highland",
      "Mountain",
    ]);
    expect(options(select("Map quality"))).toEqual([
      "Q1",
      "Q2",
      "Q3",
      "Q4",
      "Q5",
      "Q6",
    ]);
    expect(options(select("Power level"))).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
    ]);
  });

  it("sets up a hideout from its biome, map quality and power level", () => {
    const latest = renderBar({ kind: "location", locationId: "0000" });

    choose("Crafting location", "hideout");

    expect(latest()?.place).toEqual({
      kind: "hideout",
      biomeId: "SWAMP",
      quality: 6,
      level: 9,
    });

    choose("Biome", "FOREST");
    choose("Map quality", "3");
    choose("Power level", "5");

    expect(latest()?.place).toEqual({
      kind: "hideout",
      biomeId: "FOREST",
      quality: 3,
      level: 5,
    });

    choose("Map quality", "6");
    choose("Power level", "9");

    expect(preview()).toEqual([
      "Base26%20.63%85%45.95%",
      "Specialty82%45.05%141%58.51%",
    ]);
  });

  it("starts a hideout on the biome that shares the city's specialties", () => {
    const latest = renderBar({ kind: "location", locationId: "3004" });

    choose("Crafting location", "hideout");

    expect(latest()?.place).toMatchObject({ biomeId: "HIGHLAND" });
  });

  it("remembers your hideout after you pick a city", () => {
    const latest = renderBar({
      kind: "hideout",
      biomeId: "STEPPE",
      quality: 4,
      level: 8,
    });

    choose("Crafting location", "1000");
    choose("Crafting location", "hideout");

    expect(latest()?.place).toEqual({
      kind: "hideout",
      biomeId: "STEPPE",
      quality: 4,
      level: 8,
    });
  });

  it("buys only in the cities, and sells in the Black Market and Black Zone too", () => {
    renderBar();

    expect(groups("Buy materials in")).toEqual([
      ROYAL_CITIES,
      CAERLEON_AND_BRECILIEN,
    ]);
    expect(groups("Sell in")).toEqual([
      ROYAL_CITIES,
      CAERLEON_AND_BRECILIEN,
      ["Black Market", ["Black Market"]],
      [
        "Black Zone (sparse data — manual prices likely)",
        ["Arthur's Rest", "Merlyn's Rest", "Morgana's Rest"],
      ],
    ]);
  });

  it("changes where you buy and where you sell", () => {
    const latest = renderBar();

    choose("Buy materials in", "Martlock");
    choose("Sell in", "Arthurs Rest Smugglers Network");

    expect(latest()).toMatchObject({
      buyMarketId: "Martlock",
      sellMarketId: "Arthurs Rest Smugglers Network",
    });
  });

  it("says the Black Market is priced at its buy orders", () => {
    renderBar();

    expect(select("Sell in")).not.toHaveAccessibleDescription();

    choose("Sell in", "Black Market");

    expect(select("Sell in")).toHaveAccessibleDescription(
      "Priced at its highest buy order",
    );
  });
});
