import { describe, expect, it } from "vitest";

import { pinMaterial } from "./material-pins.helpers";
import { parsePins } from "./material-pins.schema";

describe("pinMaterial", () => {
  it("pins a material, moves its pin, and takes it away", () => {
    const pinned = pinMaterial({}, "T4_METALBAR", "Thetford");
    const moved = pinMaterial(pinned, "T4_METALBAR", "Caerleon");

    expect(moved).toEqual({ T4_METALBAR: "Caerleon" });
    expect(pinMaterial(moved, "T4_METALBAR", undefined)).toEqual({});
  });
});

describe("parsePins", () => {
  it("keeps pins to markets it buys in, and drops the rest", () => {
    expect(
      parsePins({
        T4_METALBAR: "Thetford",
        T4_LEATHER: "Black Market",
        T4_CLOTH: 3,
      }),
    ).toEqual({ T4_METALBAR: "Thetford" });
  });

  it("starts with no pins from anything but an object", () => {
    expect(parsePins("Thetford")).toEqual({});
  });
});
