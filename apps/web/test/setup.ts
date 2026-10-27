import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// jsdom has no media queries and doesn't scroll: every screen counts as wide.
window.matchMedia = (media) => ({
  matches: true,
  media,
  onchange: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn(),
  dispatchEvent: () => false,
});

Element.prototype.scrollIntoView = vi.fn();

afterEach(() => {
  cleanup();
});
