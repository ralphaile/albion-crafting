import { type RefObject, useEffect, useEffectEvent } from "react";

// While `open`, a click or focus outside `wrapRef` or Escape calls `onDismiss`.
// Escape also gives the focus back to `buttonRef`, and closes only this, not a
// panel it's in.
export function useDismiss(
  open: boolean,
  onDismiss: () => void,
  wrapRef: RefObject<HTMLElement | null>,
  buttonRef: RefObject<HTMLElement | null>,
): void {
  const dismiss = useEffectEvent(onDismiss);

  useEffect(() => {
    if (!open) {
      return;
    }
    const closeFromOutside = ({ target }: Event) => {
      if (target instanceof Node && !wrapRef.current?.contains(target)) {
        dismiss();
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        dismiss();
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeFromOutside);
    document.addEventListener("focusin", closeFromOutside);
    document.addEventListener("keydown", closeOnEscape, true);
    return () => {
      document.removeEventListener("pointerdown", closeFromOutside);
      document.removeEventListener("focusin", closeFromOutside);
      document.removeEventListener("keydown", closeOnEscape, true);
    };
  }, [open, wrapRef, buttonRef]);
}
