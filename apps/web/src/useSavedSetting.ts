import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type { SavedSetting, SettingsStore } from "./saved-settings.types";

// Saves only once the user changes the value, so opening a link shows its
// value without replacing the one this browser saved.
export function useSavedSetting<T>(
  store: SettingsStore,
  setting: SavedSetting<T>,
  initial: () => T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState(initial);
  const changedByUser = useRef(false);
  const change = useCallback((next: SetStateAction<T>) => {
    changedByUser.current = true;
    setValue(next);
  }, []);

  useEffect(() => {
    if (changedByUser.current) {
      void store.save(setting, value);
    }
  }, [store, setting, value]);

  return [value, change];
}
