import { type ReactNode, useId, useRef, useState } from "react";

import type { DailyBonus } from "@aoc/core";

import {
  DAILY_BONUS_GROUPS,
  DEFAULT_SETTINGS,
  MAX_DAILY_BONUSES,
  MAX_STALE_HOURS,
  MAX_STATION_FEE,
  SERVERS,
} from "./settings.constants";
import type { CraftingSettings } from "./settings.types";
import styles from "./SettingsPanel.module.css";

const NO_BONUS = "";

const BONUS_SIZES: readonly DailyBonus["bonus"][] = [0.1, 0.2];

function parseWhole(text: string, min: number, max: number) {
  const value = Number(text);
  return text.trim() !== "" &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
    ? value
    : undefined;
}

// Shown on hover, keyboard focus or a tap, and read with its setting.
function Help({
  id,
  about,
  children,
}: {
  id: string;
  about: string;
  children: ReactNode;
}) {
  const [pinned, setPinned] = useState(false);
  return (
    <span className={styles.help}>
      <button
        type="button"
        className={styles.helpButton}
        aria-label={`About ${about}`}
        aria-describedby={id}
        onClick={() => {
          setPinned((was) => !was);
        }}
        onBlur={() => {
          setPinned(false);
        }}
      >
        ?
      </button>
      <span id={id} role="tooltip" className={styles.tip} data-pinned={pinned}>
        {children}
      </span>
    </span>
  );
}

function Check({
  label,
  checked,
  onChange,
  help,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  help: string;
}) {
  const helpId = useId();
  return (
    <div className={styles.title}>
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={checked}
          aria-describedby={helpId}
          onChange={(event) => {
            onChange(event.target.checked);
          }}
        />
        {label}
      </label>
      <Help id={helpId} about={label}>
        {help}
      </Help>
    </div>
  );
}

function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
  help,
}: {
  label: string;
  value: T;
  options: readonly { id: T; label: string }[];
  onChange: (value: T) => void;
  help: string;
}) {
  const labelId = useId();
  const helpId = useId();
  const name = useId();
  return (
    <div className={styles.setting}>
      <div className={styles.title}>
        <span id={labelId} className={styles.label}>
          {label}
        </span>
        <Help id={helpId} about={label}>
          {help}
        </Help>
      </div>
      <div
        className={styles.toggles}
        role="radiogroup"
        aria-labelledby={labelId}
        aria-describedby={helpId}
      >
        {options.map((option) => (
          <label key={option.id} className={styles.radio}>
            <input
              type="radio"
              name={name}
              checked={value === option.id}
              onChange={() => {
                onChange(option.id);
              }}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function WholeNumber({
  label,
  unit,
  value,
  min,
  max,
  onChange,
  help,
}: {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  help: string;
}) {
  const id = useId();
  const unitId = useId();
  const helpId = useId();
  const [draft, setDraft] = useState({ text: String(value), value });
  if (draft.value !== value) {
    setDraft({ text: String(value), value });
  }
  return (
    <div className={styles.setting}>
      <div className={styles.title}>
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
        <Help id={helpId} about={label}>
          {help}
        </Help>
      </div>
      <div className={styles.withUnit}>
        <input
          id={id}
          className={styles.number}
          type="number"
          inputMode="numeric"
          step={1}
          min={min}
          max={max}
          value={draft.text}
          aria-describedby={`${unitId} ${helpId}`}
          onChange={(event) => {
            const text = event.target.value;
            const parsed = parseWhole(text, min, max);
            setDraft({ text, value: parsed ?? draft.value });
            if (parsed !== undefined && parsed !== value) {
              onChange(parsed);
            }
          }}
          onBlur={() => {
            setDraft({ text: String(value), value });
          }}
        />
        <span id={unitId} className={styles.unit}>
          {unit}
        </span>
      </div>
    </div>
  );
}

function DailyBonuses({
  bonuses,
  onChange,
}: {
  bonuses: readonly DailyBonus[];
  onChange: (bonuses: DailyBonus[]) => void;
}) {
  const labelId = useId();
  const helpId = useId();
  // The chosen bonuses, then an empty row to add another.
  const rows: (DailyBonus | undefined)[] =
    bonuses.length < MAX_DAILY_BONUSES ? [...bonuses, undefined] : [...bonuses];
  const setRow = (index: number, next: DailyBonus | undefined) => {
    onChange(
      rows
        .map((row, other) => (other === index ? next : row))
        .filter((row): row is DailyBonus => row !== undefined),
    );
  };

  return (
    <div
      className={styles.setting}
      role="group"
      aria-labelledby={labelId}
      aria-describedby={helpId}
    >
      <div className={styles.title}>
        <span id={labelId} className={styles.label}>
          Daily bonuses
        </span>
        <Help id={helpId} about="Daily bonuses">
          Today’s production bonuses in the game, +10% or +20% for a crafting
          category.
        </Help>
      </div>
      {rows.map((row, index) => (
        <div key={index} className={styles.bonus}>
          <select
            className={styles.select}
            aria-label={`Daily bonus ${String(index + 1)}`}
            value={row?.category ?? NO_BONUS}
            onChange={(event) => {
              const category = event.target.value;
              setRow(
                index,
                category === NO_BONUS
                  ? undefined
                  : { category, bonus: row?.bonus ?? 0.1 },
              );
            }}
          >
            <option value={NO_BONUS}>None</option>
            {DAILY_BONUS_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <select
            className={styles.select}
            aria-label={`Daily bonus ${String(index + 1)} size`}
            value={String(row?.bonus ?? 0.1)}
            disabled={row === undefined}
            onChange={(event) => {
              const bonus = BONUS_SIZES.find(
                (size) => String(size) === event.target.value,
              );
              if (row !== undefined && bonus !== undefined) {
                setRow(index, { ...row, bonus });
              }
            }}
          >
            {BONUS_SIZES.map((size) => (
              <option key={size} value={String(size)}>
                +{Math.round(size * 100)}%
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}

export function SettingsPanel({
  settings,
  onChange,
  onClearCache,
}: {
  settings: CraftingSettings;
  onChange: (settings: CraftingSettings) => void;
  onClearCache: () => Promise<void>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const serverId = useId();
  const serverHelpId = useId();
  const [cache, setCache] = useState<"kept" | "clearing" | "cleared">("kept");
  const set = <K extends keyof CraftingSettings>(
    key: K,
    value: CraftingSettings[K],
  ) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <>
      <button
        type="button"
        className={styles.open}
        aria-haspopup="dialog"
        onClick={() => {
          setCache("kept");
          dialogRef.current?.showModal();
        }}
      >
        <svg className={styles.sliders} viewBox="0 0 16 16" aria-hidden="true">
          <path d="M1.5 4h8M12.5 4h2M1.5 8h2M6.5 8h8M1.5 12h9M13.5 12h1" />
          <circle cx="11" cy="4" r="1.5" />
          <circle cx="5" cy="8" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
        </svg>
        Settings
      </button>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- a click outside the panel lands on the dialog's backdrop; keyboards close it with Escape */}
      <dialog
        ref={dialogRef}
        className={styles.panel}
        aria-labelledby={headingId}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            dialogRef.current?.close();
          }
        }}
      >
        <div className={styles.sheet}>
          <header className={styles.header}>
            <h2 id={headingId} className={styles.heading}>
              Settings
            </h2>
            <button
              type="button"
              className={styles.close}
              aria-label="Close settings"
              onClick={() => {
                dialogRef.current?.close();
              }}
            >
              <svg viewBox="0 0 10 10" aria-hidden="true">
                <path d="M2 2l6 6M8 2L2 8" />
              </svg>
            </button>
          </header>
          <div className={styles.body}>
            <section className={styles.section}>
              <h3 className={styles.sectionHeading}>Crafting</h3>
              <Check
                label="Use focus"
                checked={settings.focus}
                onChange={(focus) => {
                  set("focus", focus);
                }}
                help="Focus raises the return rate, so more materials come back. Silver per focus ranks crafts by how well they use it."
              />
              <Check
                label="Premium"
                checked={settings.premium}
                onChange={(premium) => {
                  set("premium", premium);
                }}
                help="Premium halves the market tax, from 8% to 4% of each sale."
              />
              <WholeNumber
                label="Station fee"
                unit="silver per 100 nutrition"
                value={settings.stationFee}
                min={0}
                max={MAX_STATION_FEE}
                onChange={(stationFee) => {
                  set("stationFee", stationFee);
                }}
                help="Each station’s owner sets it, often between 0 and 1,000. Your own island costs 0."
              />
              <DailyBonuses
                bonuses={settings.dailyBonuses}
                onChange={(dailyBonuses) => {
                  set("dailyBonuses", dailyBonuses);
                }}
              />
            </section>
            <section className={styles.section}>
              <h3 className={styles.sectionHeading}>Market</h3>
              <Choice
                label="Buy materials by"
                value={settings.buyMode}
                options={[
                  { id: "instant", label: "Instant buy" },
                  { id: "order", label: "Buy order" },
                ]}
                onChange={(buyMode) => {
                  set("buyMode", buyMode);
                }}
                help="Instant buy pays the cheapest sell order. A buy order usually costs less, but adds a 2.5% setup fee and takes time to fill."
              />
              <Choice
                label="Sell by"
                value={settings.sellMode}
                options={[
                  { id: "order", label: "Sell order" },
                  { id: "instant", label: "Instant sell" },
                ]}
                onChange={(sellMode) => {
                  set("sellMode", sellMode);
                }}
                help="A sell order lists at the cheapest sell order and adds a 2.5% setup fee. Instant sell takes the best buy order. Selling to the Black Market is always instant."
              />
              <WholeNumber
                label="Stale after"
                unit="hours"
                value={settings.staleAfterHours}
                min={1}
                max={MAX_STALE_HOURS}
                onChange={(staleAfterHours) => {
                  set("staleAfterHours", staleAfterHours);
                }}
                help="Prices older than this get a red dot and count as stale."
              />
              <div className={styles.setting}>
                <div className={styles.title}>
                  <label htmlFor={serverId} className={styles.label}>
                    Server
                  </label>
                  <Help id={serverHelpId} about="Server">
                    The game server whose market prices to use.
                  </Help>
                </div>
                <select
                  id={serverId}
                  className={styles.select}
                  value={settings.server}
                  aria-describedby={serverHelpId}
                  onChange={(event) => {
                    const server = SERVERS.find(
                      ({ id }) => id === event.target.value,
                    );
                    if (server !== undefined) {
                      set("server", server.id);
                    }
                  }}
                >
                  {SERVERS.map((server) => (
                    <option key={server.id} value={server.id}>
                      {server.label}
                    </option>
                  ))}
                </select>
              </div>
            </section>
          </div>
          <footer className={styles.actions}>
            <button
              type="button"
              className={styles.action}
              onClick={() => {
                onChange(DEFAULT_SETTINGS);
              }}
            >
              Reset to defaults
            </button>
            <button
              type="button"
              className={styles.action}
              disabled={cache === "clearing"}
              onClick={() => {
                setCache("clearing");
                void onClearCache().then(() => {
                  setCache("cleared");
                });
              }}
            >
              Clear price cache
            </button>
            <p className={styles.status} role="status">
              {cache === "cleared" && "Saved prices cleared"}
            </p>
          </footer>
        </div>
      </dialog>
    </>
  );
}
