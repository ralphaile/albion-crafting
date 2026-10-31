import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { craftingTrees } from "@aoc/crafting-data";

import { FIRST_TREE_ID, NO_SPECIALIZATIONS } from "./specializations.constants";
import type { SpecializationProfile } from "./specializations.types";
import { SpecializationsPanel } from "./SpecializationsPanel";

function Editor({ initial }: { initial: SpecializationProfile }) {
  const [profile, setProfile] = useState(initial);
  const [shown, setShown] = useState({ open: false, treeId: FIRST_TREE_ID });
  return (
    <>
      <SpecializationsPanel
        profile={profile}
        onChange={setProfile}
        open={shown.open}
        treeId={shown.treeId}
        onShow={(treeId) => {
          setShown({ open: true, treeId });
        }}
        onClose={() => {
          setShown({ ...shown, open: false });
        }}
      />
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

function fileInput() {
  return within(panel()).getByLabelText("Specializations file", {
    hidden: true,
  });
}

function chooseFile(contents: string) {
  fireEvent.change(fileInput(), {
    target: {
      files: [
        new File([contents], "specializations.json", {
          type: "application/json",
        }),
      ],
    },
  });
}

describe("SpecializationsPanel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts on the Sword tree, with its mastery and every sword", () => {
    open({ sword: { mastery: 100, specializations: { "2H_CLAYMORE": 40 } } });

    expect(within(panel()).getByRole("combobox", { name: "Tree" })).toHaveValue(
      "sword",
    );
    expect(level("Mastery")).toHaveValue(100);
    expect(level("Claymore")).toHaveValue(40);
    expect(level("Broadsword")).toHaveValue(0);
    expect(within(panel()).getAllByRole("spinbutton")).toHaveLength(10);
  });

  it("shows each specialization's item icon by its name", () => {
    open();

    expect(
      level("Broadsword").closest("li")?.querySelector("img"),
    ).toHaveAttribute("src", expect.stringContaining("/T4_MAIN_SWORD.png"));
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

  it("sets every specialization in the tree, and keeps its mastery", () => {
    const sword = craftingTrees.find(({ id }) => id === "sword");
    open({ sword: { mastery: 70, specializations: { MAIN_SWORD: 100 } } });

    fireEvent.change(level("Set all specs to"), { target: { value: "50" } });
    fireEvent.click(within(panel()).getByRole("button", { name: "Set" }));

    expect(profile()).toEqual({
      sword: {
        mastery: 70,
        specializations: Object.fromEntries(
          sword?.specializations.map(({ id }) => [id, 50]) ?? [],
        ),
      },
    });
    expect(level("Mastery")).toHaveValue(70);
    expect(level("Broadsword")).toHaveValue(50);
    expect(level("Set all specs to")).toHaveValue(null);
  });

  it("leaves the tree alone when the bulk level is outside 0 to 100", () => {
    open({ sword: { mastery: 70, specializations: { MAIN_SWORD: 100 } } });

    fireEvent.change(level("Set all specs to"), { target: { value: "101" } });

    expect(within(panel()).getByRole("button", { name: "Set" })).toBeDisabled();
    expect(profile()).toEqual({
      sword: { mastery: 70, specializations: { MAIN_SWORD: 100 } },
    });
  });

  it("replaces the profile from a JSON file, and leaves it when the file has none", async () => {
    open({ sword: { mastery: 10, specializations: {} } });

    chooseFile(
      JSON.stringify({
        sword: { mastery: 12, specializations: { MAIN_SWORD: 34, NOPE: 80 } },
        bagtype: { mastery: 100, specializations: {} },
      }),
    );

    expect(await within(panel()).findByRole("status")).toHaveTextContent(
      "Imported",
    );
    expect(profile()).toEqual({
      sword: { mastery: 12, specializations: { MAIN_SWORD: 34 } },
    });
    expect(level("Mastery")).toHaveValue(12);
    expect(level("Broadsword")).toHaveValue(34);

    chooseFile("{");
    await waitFor(() => {
      expect(within(panel()).getByRole("status")).toHaveTextContent(
        "That file isn't JSON",
      );
    });
    expect(profile()).toEqual({
      sword: { mastery: 12, specializations: { MAIN_SWORD: 34 } },
    });

    chooseFile(
      JSON.stringify({ bagtype: { mastery: 5, specializations: {} } }),
    );
    await waitFor(() => {
      expect(within(panel()).getByRole("status")).toHaveTextContent(
        "No specialization levels in that file",
      );
    });
    expect(profile()).toEqual({
      sword: { mastery: 12, specializations: { MAIN_SWORD: 34 } },
    });
  });

  it("exports the profile as JSON", async () => {
    let blob: Blob | undefined;
    vi.spyOn(URL, "createObjectURL").mockImplementation((value) => {
      if (value instanceof Blob) {
        blob = value;
      }
      return "blob:profile";
    });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function clickDownload(this: HTMLAnchorElement) {
        expect(this.download).toBe("specializations.json");
      });

    open({ sword: { mastery: 100, specializations: { MAIN_SWORD: 40 } } });
    fireEvent.click(within(panel()).getByRole("button", { name: "Export" }));

    expect(click).toHaveBeenCalledOnce();
    if (!(blob instanceof Blob)) {
      throw new Error("Export did not build a file");
    }
    expect(JSON.parse(await blob.text())).toEqual({
      sword: { mastery: 100, specializations: { MAIN_SWORD: 40 } },
    });
  });
});
