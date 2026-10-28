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

// jsdom's dialog can't open as a modal or close itself.
HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
  this.open = true;
};
HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
  this.open = false;
};

afterEach(() => {
  cleanup();
});
