import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ItemIcon, siteIconUrl } from "./ItemIcon";

const SITE_ICON = siteIconUrl("T5_MAIN_SWORD@1");
const RENDER_ICON =
  "https://render.albiononline.com/v1/item/T5_MAIN_SWORD@1.png?quality=1&size=64";

function icon() {
  return screen.getByRole("presentation");
}

function failToLoad() {
  fireEvent.error(icon());
}

function wait(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ItemIcon", () => {
  it("lazy-loads the item's icon from the site", () => {
    render(<ItemIcon id="T5_MAIN_SWORD@1" />);

    expect(icon()).toHaveAttribute("src", SITE_ICON);
    expect(icon()).toHaveAttribute("loading", "lazy");
  });

  it("loads the render service's icon straight away when the site has none", () => {
    render(<ItemIcon id="T5_MAIN_SWORD@1" />);

    failToLoad();

    expect(icon()).toHaveAttribute("src", RENDER_ICON);
  });

  it("shows a placeholder while it waits to try the render service again", () => {
    render(<ItemIcon id="T5_MAIN_SWORD@1" />);

    failToLoad();
    failToLoad();

    expect(icon().getAttribute("src")).toMatch(/^data:image\/svg\+xml,/);
  });

  it("tries the render service again after 1 second, then after 3 more", () => {
    render(<ItemIcon id="T5_MAIN_SWORD@1" />);
    failToLoad();

    failToLoad();
    wait(999);
    expect(icon()).not.toHaveAttribute("src", RENDER_ICON);
    wait(1);
    expect(icon()).toHaveAttribute("src", RENDER_ICON);

    failToLoad();
    wait(2999);
    expect(icon()).not.toHaveAttribute("src", RENDER_ICON);
    wait(1);
    expect(icon()).toHaveAttribute("src", RENDER_ICON);
  });

  it("keeps the placeholder after the render service fails a third time", () => {
    render(<ItemIcon id="T5_MAIN_SWORD@1" />);
    failToLoad();

    failToLoad();
    wait(1000);
    failToLoad();
    wait(3000);
    failToLoad();
    wait(60_000);

    expect(icon().getAttribute("src")).toMatch(/^data:image\/svg\+xml,/);
  });

  it("starts over with the site's icon when it shows a different item", () => {
    const { rerender } = render(<ItemIcon id="T5_MAIN_SWORD@1" />);
    failToLoad();

    rerender(<ItemIcon id="T5_MAIN_SWORD@2" />);

    expect(icon()).toHaveAttribute("src", siteIconUrl("T5_MAIN_SWORD@2"));
  });
});
