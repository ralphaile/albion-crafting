import { describe, expect, it } from "vitest";

import {
  formatAge,
  formatBonus,
  formatCount,
  formatPercent,
  formatReturnRate,
  formatSilver,
  formatSilverPerFocus,
} from "./format.helpers";

describe("formatSilver", () => {
  it.each([
    [12_480, "12,480"],
    [1_234_567.4, "1,234,567"],
    [-1240.6, "−1,241"],
    [-0.4, "0"],
    [0, "0"],
  ])("shows %d as %s", (value, expected) => {
    expect(formatSilver(value)).toBe(expected);
  });

  it("uses a true minus sign, not a hyphen", () => {
    expect(formatSilver(-5)).toBe("\u22125");
  });
});

describe("formatCount", () => {
  it("shows a count with thousands separators", () => {
    expect(formatCount(5950)).toBe("5,950");
  });
});

describe("formatPercent", () => {
  it.each([
    [0.182, "18.2%"],
    [0.4792, "47.9%"],
    [-0.031, "−3.1%"],
    [12.5, "1,250.0%"],
    [0, "0.0%"],
  ])("shows %d as %s", (value, expected) => {
    expect(formatPercent(value)).toBe(expected);
  });
});

describe("formatBonus", () => {
  it.each([
    [0.18, "18%"],
    [0.26 + 0.26 + 0.3, "82%"],
    [0.0375, "3.75%"],
    [0, "0%"],
  ])("shows %d as %s", (value, expected) => {
    expect(formatBonus(value)).toBe(expected);
  });
});

describe("formatReturnRate", () => {
  it.each([
    [0.82 / 1.82, "45.05%"],
    [1.41 / 2.41, "58.51%"],
    [0, "0.00%"],
  ])("shows %d as %s", (value, expected) => {
    expect(formatReturnRate(value)).toBe(expected);
  });
});

describe("formatSilverPerFocus", () => {
  it.each([
    [4.214, "4.2"],
    [10, "10.0"],
    [1234.56, "1,234.6"],
  ])("shows %d as %s", (value, expected) => {
    expect(formatSilverPerFocus(value)).toBe(expected);
  });
});

describe("formatAge", () => {
  it.each([
    [0, "0 min"],
    [59, "59 min"],
    [60, "1 h"],
    [14 * 60 + 59, "14 h"],
    [48 * 60 - 1, "47 h"],
    [48 * 60, "2 d"],
    [10 * 24 * 60, "10 d"],
  ])("shows %d minutes as %s", (minutes, expected) => {
    expect(formatAge(minutes)).toBe(expected);
  });
});
