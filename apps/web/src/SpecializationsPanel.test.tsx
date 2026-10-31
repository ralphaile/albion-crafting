import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { NO_SPECIALIZATIONS } from "./specializations.constants";
import type { SpecializationProfile } from "./specializations.types";
import { SpecializationsPanel } from "./SpecializationsPanel";

function Editor({ initial }: { initial: SpecializationProfile }) {
  const [profile, setProfile] = useState(initial);
  return (
    <>
      <SpecializationsPanel profile={profile} onChange={setProfile} />
      <output aria-label="profile">{JSON.stringify(profile)}</output>
    </>
  );
}

function open(initial: SpecializationProfile = NO_SPECIALIZATIONS) {
  render(<Editor initial={initial} />);
  fireEvent.click(screen.getByRole("button", { name: "Specializations" }));
}

function panel() {
  return screen.getByRole("dialog", { name: "Specializations" });
}

function level(name: string) {
  return within(panel()).getByRole("spinbutton", { name });
}

function profile(): unknown {
  return JSON.parse(
    screen.getByRole("status", { name: "profile" }).textContent,
  );
}

describe("SpecializationsPanel", () => {
  it("starts on the Sword tree, with its mastery and every sword", () => {
    open({ sword: { mastery: 100, specializations: { "2H_CLAYMORE": 40 } } });

    expect(within(panel()).getByRole("combobox", { name: "Tree" })).toHaveValue(
      "sword",
    );
    expect(level("Mastery")).toHaveValue(100);
    expect(level("Claymore")).toHaveValue(40);
    expect(level("Broadsword")).toHaveValue(0);
    expect(within(panel()).getAllByRole("spinbutton")).toHaveLength(9);
  });

  it("groups the trees by the building that crafts them", () => {
    open();

    expect(
      within(panel())
        .getAllByRole("group")
        .map((group) => group.getAttribute("label")),
    ).toEqual(["Warrior's Forge", "Hunter's Lodge", "Mage's Tower"]);
  });

  it("sets the levels of another tree", () => {
    open();

    fireEvent.change(within(panel()).getByRole("combobox", { name: "Tree" }), {
      target: { value: "plate_armor" },
    });
    fireEvent.change(level("Mastery"), { target: { value: "80" } });
    fireEvent.change(level("Soldier Armor"), { target: { value: "25" } });

    expect(profile()).toEqual({
      plate_armor: { mastery: 80, specializations: { ARMOR_PLATE_SET1: 25 } },
    });
  });

  it.each(["101", "-1", "12.5", ""])(
    "ignores %j, and shows the level again on leaving the field",
    (text) => {
      open({ sword: { mastery: 60, specializations: {} } });

      fireEvent.change(level("Mastery"), { target: { value: text } });
      expect(profile()).toEqual({
        sword: { mastery: 60, specializations: {} },
      });

      fireEvent.blur(level("Mastery"));
      expect(level("Mastery")).toHaveValue(60);
    },
  );
});
