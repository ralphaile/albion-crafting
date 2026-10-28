export interface SavedSetting<T> {
  id: string;
  version: number;
  parse: (value: unknown) => T;
}

export interface SettingsStore {
  readonly persistent: boolean;
  load<T>(setting: SavedSetting<T>): Promise<T | undefined>;
  save<T>(setting: SavedSetting<T>, value: T): Promise<void>;
}
