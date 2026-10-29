import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { SeenPrice, UsedPrice } from "./best-crafts.types";
import { PriceBadge } from "./PriceBadge";

function seen(
  value: number,
  ageMinutes: number,
  status: SeenPrice["status"] = "fresh",
): SeenPrice {
  return { status, value, observedAt: 0, ageMinutes };
}

function renderBadge(price: UsedPrice) {
  render(
    <PriceBadge price={price} announceName>
      item
    </PriceBadge>,
  );
}

describe("PriceBadge", () => {
  it.each([
    [
      "a fresh API price",
      { ...seen(4800, 30), origin: "api" },
      "API fresh 4,800, seen 30 min ago",
      "item, API fresh",
    ],
    [
      "a stale API price",
      { ...seen(4800, 14 * 60, "stale"), origin: "api" },
      "API stale 4,800, seen 14 h ago",
      "item, API stale",
    ],
    [
      "a typed price",
      { ...seen(5000, 120), origin: "manual" },
      "Manual 5,000, typed 2 h ago",
      "item, Manual",
    ],
    [
      "a stale typed price",
      { ...seen(5000, 4 * 24 * 60, "stale"), origin: "manual" },
      "Manual, stale 5,000, typed 4 d ago",
      "item, Manual",
    ],
    [
      "a missing price",
      { status: "missing", origin: "api" },
      "Missing",
      "item, Missing",
    ],
  ] satisfies [string, UsedPrice, string, string][])(
    "names %s",
    (_price, price, title, text) => {
      renderBadge(price);

      expect(screen.getByTitle(title)).toHaveTextContent(text);
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    },
  );

  describe("with both an API price and a typed one", () => {
    const price: UsedPrice = {
      ...seen(4800, 30),
      origin: "api",
      passedOver: seen(5000, 120),
    };

    function tipOpen() {
      return screen.getByRole("tooltip").dataset.open;
    }

    it("describes both, with the one not used second", () => {
      renderBadge(price);

      expect(
        screen.getByRole("button", { name: "item, API fresh" }),
      ).toHaveAccessibleDescription(
        "API fresh 4,800, seen 30 min ago Not used: Manual 5,000, typed 2 h ago",
      );
    });

    it("shows the tooltip while the pointer is over it", () => {
      renderBadge(price);
      const badge = screen.getByRole("button");
      expect(tipOpen()).toBe("false");

      fireEvent.mouseEnter(badge);
      expect(tipOpen()).toBe("true");

      fireEvent.mouseLeave(badge);
      expect(tipOpen()).toBe("false");
    });

    it("shows the tooltip on focus from the keyboard, until focus leaves", () => {
      renderBadge(price);
      const badge = screen.getByRole("button");

      fireEvent.focus(badge);
      expect(tipOpen()).toBe("true");

      fireEvent.blur(badge);
      expect(tipOpen()).toBe("false");
    });

    it("toggles the tooltip on a tap", () => {
      renderBadge(price);
      const badge = screen.getByRole("button");

      fireEvent.pointerDown(badge);
      fireEvent.focus(badge);
      fireEvent.click(badge);
      expect(tipOpen()).toBe("true");

      fireEvent.click(badge);
      expect(tipOpen()).toBe("false");
    });
  });
});
