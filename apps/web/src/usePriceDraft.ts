import { type KeyboardEvent, useState } from "react";

import type { ManualPrice, ManualPriceKey } from "./manual-prices.types";

const WHOLE_NUMBER = /^\d+$/;

function parseSilver(text: string) {
  const silver = Number(text);
  return WHOLE_NUMBER.test(text) && silver > 0 && Number.isSafeInteger(silver)
    ? silver
    : undefined;
}

// What's typed in a price field. Enter or leaving the field saves it as a
// typed price, and an empty field removes the typed one. `onEntered` runs
// after Enter saved or removed it.
export function usePriceDraft({
  priceKey,
  manual,
  onSave,
  onRemove,
  onEntered,
}: {
  priceKey: ManualPriceKey;
  manual: ManualPrice | undefined;
  onSave: (price: ManualPrice) => void;
  onRemove: (key: ManualPriceKey) => void;
  onEntered?: (() => void) | undefined;
}) {
  const saved = manual === undefined ? "" : String(manual.value);
  const [draft, setDraft] = useState({ text: saved, saved, invalid: false });
  if (draft.saved !== saved) {
    setDraft({ text: saved, saved, invalid: false });
  }

  function commit() {
    const text = draft.text.trim();
    if (text === saved) {
      return false;
    }
    if (text === "") {
      onRemove(priceKey);
      return true;
    }
    const value = parseSilver(text);
    if (value === undefined) {
      setDraft({ ...draft, invalid: true });
      return false;
    }
    onSave({ ...priceKey, value, enteredAt: Date.now() });
    return true;
  }

  return {
    invalid: draft.invalid,
    inputProps: {
      type: "text",
      inputMode: "numeric",
      autoComplete: "off",
      value: draft.text,
      "aria-invalid": draft.invalid,
      onChange: (event: { target: { value: string } }) => {
        setDraft({ text: event.target.value, saved, invalid: false });
      },
      onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") {
          event.preventDefault();
          if (commit()) {
            onEntered?.();
          }
        } else if (event.key === "Escape" && draft.text !== saved) {
          // Cancels the typing; a second Escape closes a panel it's in.
          event.preventDefault();
          setDraft({ text: saved, saved, invalid: false });
        }
      },
      onBlur: commit,
    },
  } as const;
}
