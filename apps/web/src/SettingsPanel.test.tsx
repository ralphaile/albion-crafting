import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { DEFAULT_SETTINGS } from "./settings.constants";
import type { CraftingSettings } from "./settings.types";
import { SettingsPanel } from "./SettingsPanel";

function Panel({
  initial,
  onChange,
  onClearCache,
}: {
  initial: CraftingSettings;
  onChange: (settings: CraftingSettings) => void;
  onClearCache: () => Promise<void>;
}) {
  const [settings, setSettings] = useState(initial);
  return (
    <SettingsPanel
      settings={settings}
      onChange={(next) => {
        setSettings(next);
        onChange(next);
      }}
      onClearCache={onClearCache}
    />
  );
}

function openPanel({
  initial = DEFAULT_SETTINGS,
  onClearCache = () => Promise.resolve(),
}: {
  initial?: CraftingSettings;
  onClearCache?: () => Promise<void>;
} = {}) {
  const changes: CraftingSettings[] = [];
  render(
    <Panel
      initial={initial}
      onChange={(settings) => {
        changes.push(settings);
      }}
      onClearCache={onClearCache}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
  return () => changes.at(-1);
}

function panel() {
  return screen.queryByRole("dialog", { name: "Settings" });
}

function number(name: string) {
  return screen.getByRole("spinbutton", { name });
}

function select(name: string) {
  return screen.getByRole("combobox", { name });
}

describe("SettingsPanel", () => {
  it("opens from the Settings button and closes with its close button", () => {
    render(
      <SettingsPanel
        settings={DEFAULT_SETTINGS}
        onChange={vi.fn()}
        onClearCache={vi.fn()}
      />,
    );
    expect(panel()).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(panel()).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close settings" }));
    expect(panel()).not.toBeInTheDocument();
  });

  it("closes on a click outside the panel, but not inside it", () => {
    openPanel();
    const dialog = panel();
    if (dialog === null) {
      throw new Error("The panel didn't open");
    }

    fireEvent.click(screen.getByRole("heading", { name: "Settings" }));
    expect(panel()).toBeInTheDocument();

    fireEvent.click(dialog);
    expect(panel()).not.toBeInTheDocument();
  });

  it("changes each setting", () => {
    const lastChange = openPanel();

    fireEvent.click(screen.getByRole("checkbox", { name: "Use focus" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Premium" }));
    fireEvent.change(number("Station fee"), { target: { value: "1200" } });
    fireEvent.click(screen.getByRole("radio", { name: "Buy order" }));
    fireEvent.click(screen.getByRole("radio", { name: "Instant sell" }));
    fireEvent.change(number("Stale after"), { target: { value: "24" } });
    fireEvent.change(select("Server"), { target: { value: "europe" } });

    expect(lastChange()).toEqual({
      ...DEFAULT_SETTINGS,
      focus: false,
      premium: false,
      stationFee: 1200,
      buyMode: "order",
      sellMode: "instant",
      staleAfterHours: 24,
      server: "europe",
    });
  });

  it("keeps the last valid number, and shows it again on leaving the field", () => {
    const lastChange = openPanel();

    for (const value of ["", "-5", "2.5", "100001"]) {
      fireEvent.change(number("Station fee"), { target: { value } });
    }
    fireEvent.change(number("Stale after"), { target: { value: "0" } });

    expect(lastChange()).toBeUndefined();
    fireEvent.blur(number("Station fee"));
    expect(number("Station fee")).toHaveValue(DEFAULT_SETTINGS.stationFee);
  });

  it("adds, sizes and removes daily bonuses, up to two", () => {
    const lastChange = openPanel();
    expect(select("Daily bonus 1 size")).toBeDisabled();
    expect(
      screen.queryByRole("combobox", { name: "Daily bonus 2" }),
    ).toBeNull();

    fireEvent.change(select("Daily bonus 1"), { target: { value: "sword" } });
    fireEvent.change(select("Daily bonus 1 size"), {
      target: { value: "0.2" },
    });
    fireEvent.change(select("Daily bonus 2"), { target: { value: "offhand" } });

    expect(lastChange()?.dailyBonuses).toEqual([
      { category: "sword", bonus: 0.2 },
      { category: "offhand", bonus: 0.1 },
    ]);
    expect(
      screen.queryByRole("combobox", { name: "Daily bonus 3" }),
    ).toBeNull();

    fireEvent.change(select("Daily bonus 1"), { target: { value: "" } });

    expect(lastChange()?.dailyBonuses).toEqual([
      { category: "offhand", bonus: 0.1 },
    ]);
    expect(select("Daily bonus 1")).toHaveValue("offhand");
    expect(select("Daily bonus 2")).toHaveValue("");
  });

  it("explains each setting with its help", () => {
    openPanel();

    expect(
      screen.getByRole("radiogroup", { name: "Buy materials by" }),
    ).toHaveAccessibleDescription(/2\.5% setup fee/);
    expect(
      screen.getByRole("checkbox", { name: "Premium" }),
    ).toHaveAccessibleDescription(/from 8% to 4%/);
    expect(number("Station fee")).toHaveAccessibleDescription(
      /silver per 100 nutrition/,
    );
    expect(
      screen.getByRole("button", { name: "About Stale after" }),
    ).toHaveAccessibleDescription(/stale/);
  });

  it("resets to the defaults", () => {
    const lastChange = openPanel({
      initial: { ...DEFAULT_SETTINGS, focus: false, server: "east" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Reset to defaults" }));

    expect(lastChange()).toEqual(DEFAULT_SETTINGS);
    expect(screen.getByRole("checkbox", { name: "Use focus" })).toBeChecked();
  });

  it("clears the price cache and says so", async () => {
    const onClearCache = vi.fn(() => Promise.resolve());
    openPanel({ onClearCache });

    fireEvent.click(screen.getByRole("button", { name: "Clear price cache" }));

    expect(onClearCache).toHaveBeenCalledOnce();
    expect(await screen.findByText("Saved prices cleared")).toBeInTheDocument();
  });
});
