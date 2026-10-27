import { useCallback, useEffect, useId, useState } from "react";

import { armorPiece } from "./armor.helpers";
import styles from "./CraftFilters.module.css";
import {
  ARMOR_MATERIALS,
  ARMOR_SLOTS,
  CATEGORIES,
  ENCHANTS,
  MAX_MARGIN_PERCENT,
  MAX_PROFIT,
  MAX_SEARCH_LENGTH,
  NO_FILTERS,
  OFFHAND_TYPES,
  TIERS,
  WEAPON_TYPES,
} from "./filters.constants";
import { activeFilters } from "./filters.helpers";
import type { ArtifactFilter, Filters, Option } from "./filters.types";

export type UpdateFilters = (update: (filters: Filters) => Filters) => void;

const SEARCH_DELAY_MS = 250;

const ARTIFACT_CHOICES: readonly { id: ArtifactFilter; label: string }[] = [
  { id: "include", label: "Include" },
  { id: "exclude", label: "Exclude" },
  { id: "only", label: "Only" },
];

type SetCategories = (ids: readonly string[], on: boolean) => void;

const CATEGORY_ORDER = CATEGORIES.map(({ id }) => id);

function toggled<T>(values: readonly T[], value: T, order: readonly T[]) {
  return values.includes(value)
    ? values.filter((other) => other !== value)
    : order.filter((other) => other === value || values.includes(other));
}

function CategoryGroup({
  label,
  options,
  chosen,
  onSet,
  className,
}: {
  label: string;
  options: readonly Option[];
  chosen: readonly string[];
  onSet: SetCategories;
  className?: string | undefined;
}) {
  const id = useId();
  return (
    <div
      className={[styles.group, className].join(" ")}
      role="group"
      aria-labelledby={id}
    >
      <span id={id} className={styles.legend}>
        {label}
      </span>
      <div className={styles.options}>
        {options.map((option) => (
          <Checkbox
            key={option.id}
            label={option.label}
            checked={chosen.includes(option.id)}
            onChange={(checked) => {
              onSet([option.id], checked);
            }}
          />
        ))}
      </div>
    </div>
  );
}

// Any mix of pieces, with a whole material or slot a click away.
function ArmorGrid({
  chosen,
  onSet,
}: {
  chosen: readonly string[];
  onSet: SetCategories;
}) {
  const id = useId();
  const all = (pieces: readonly Option[]) =>
    pieces.every((piece) => chosen.includes(piece.id));
  const lineButton = (
    label: string,
    line: "row" | "column",
    pieces: readonly Option[],
  ) => (
    <button
      type="button"
      className={styles.line}
      aria-label={`${label}, whole ${line}`}
      aria-pressed={all(pieces)}
      onClick={() => {
        onSet(
          pieces.map((piece) => piece.id),
          !all(pieces),
        );
      }}
    >
      {label}
    </button>
  );

  return (
    <div className={styles.group}>
      <span id={id} className={styles.legend}>
        Armor
      </span>
      <table className={styles.armor} aria-labelledby={id}>
        <thead>
          <tr>
            <td />
            {ARMOR_SLOTS.map((slot) => (
              <th key={slot.id} scope="col">
                {lineButton(
                  slot.label,
                  "column",
                  ARMOR_MATERIALS.map((material) => armorPiece(material, slot)),
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ARMOR_MATERIALS.map((material) => (
            <tr key={material.id}>
              <th scope="row">
                {lineButton(
                  material.label,
                  "row",
                  ARMOR_SLOTS.map((slot) => armorPiece(material, slot)),
                )}
              </th>
              {ARMOR_SLOTS.map((slot) => {
                const piece = armorPiece(material, slot);
                return (
                  <td key={slot.id}>
                    <input
                      className={styles.piece}
                      type="checkbox"
                      aria-label={piece.label}
                      checked={chosen.includes(piece.id)}
                      onChange={(event) => {
                        onSet([piece.id], event.target.checked);
                      }}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Toggles({
  label,
  values,
  options,
  onToggle,
}: {
  label: string;
  values: readonly number[];
  options: readonly { value: number; label: string }[];
  onToggle: (value: number) => void;
}) {
  const id = useId();
  return (
    <div className={styles.field}>
      <span id={id} className={styles.legend}>
        {label}
      </span>
      <div className={styles.toggles} role="group" aria-labelledby={id}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={styles.toggle}
            aria-pressed={values.includes(option.value)}
            onClick={() => {
              onToggle(option.value);
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function parseWhole(text: string, min: number, max: number) {
  if (text.trim() === "") {
    return undefined;
  }
  const value = Math.round(Number(text));
  return Number.isFinite(value) && value >= min && value <= max ? value : null;
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number | undefined;
  min: number;
  max: number;
  onChange: (value: number | undefined) => void;
}) {
  const [draft, setDraft] = useState({ text: value?.toString() ?? "", value });
  if (draft.value !== value) {
    setDraft({ text: value?.toString() ?? "", value });
  }
  return (
    <label className={styles.field}>
      <span className={styles.legend}>{label}</span>
      <input
        className={styles.number}
        type="number"
        inputMode="numeric"
        step={1}
        min={min}
        max={max}
        value={draft.text}
        onChange={(event) => {
          const text = event.target.value;
          const parsed = parseWhole(text, min, max);
          const next = parsed === null ? draft.value : parsed;
          setDraft({ text, value: next });
          if (next !== value) {
            onChange(next);
          }
        }}
      />
    </label>
  );
}

function SearchField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [draft, setDraft] = useState({ text: value, value });
  if (draft.value !== value) {
    setDraft({ text: value, value });
  }
  const { text } = draft;
  useEffect(() => {
    if (text === value) {
      return;
    }
    const timer = setTimeout(() => {
      setDraft((current) => ({ ...current, value: text }));
      onChange(text);
    }, SEARCH_DELAY_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [text, value, onChange]);

  return (
    <label className={[styles.field, styles.searchField].join(" ")}>
      <span className={styles.legend}>Filter by name</span>
      <input
        className={styles.search}
        type="search"
        maxLength={MAX_SEARCH_LENGTH}
        value={text}
        onChange={(event) => {
          setDraft({ text: event.target.value, value });
        }}
      />
    </label>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={styles.check}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => {
          onChange(event.target.checked);
        }}
      />
      {label}
    </label>
  );
}

export function CraftFilters({
  filters,
  onChange,
  persistent,
}: {
  filters: Filters;
  onChange: UpdateFilters;
  persistent: boolean;
}) {
  const artifactsName = useId();
  const chips = activeFilters(filters);
  const categoryCount = filters.categories.length;
  const setCategories: SetCategories = (ids, on) => {
    onChange((current) => ({
      ...current,
      categories: CATEGORY_ORDER.filter((category) =>
        ids.includes(category) ? on : current.categories.includes(category),
      ),
    }));
  };

  const set =
    <K extends keyof Filters>(key: K) =>
    (value: Filters[K]) => {
      onChange((current) => ({ ...current, [key]: value }));
    };
  const setSearch = useCallback(
    (search: string) => {
      onChange((current) => ({ ...current, search }));
    },
    [onChange],
  );

  return (
    <section className={styles.filters} aria-label="Filters">
      <div className={styles.row}>
        <Toggles
          label="Tier"
          values={filters.tiers}
          options={TIERS.map((tier) => ({
            value: tier,
            label: `T${String(tier)}`,
          }))}
          onToggle={(tier) => {
            onChange((current) => ({
              ...current,
              tiers: toggled(current.tiers, tier, TIERS),
            }));
          }}
        />
        <Toggles
          label="Enchant"
          values={filters.enchants}
          options={ENCHANTS.map((enchant) => ({
            value: enchant,
            label: `.${String(enchant)}`,
          }))}
          onToggle={(enchant) => {
            onChange((current) => ({
              ...current,
              enchants: toggled(current.enchants, enchant, ENCHANTS),
            }));
          }}
        />
        <div className={styles.field}>
          <span id={artifactsName} className={styles.legend}>
            Artifacts
          </span>
          <div
            className={styles.toggles}
            role="radiogroup"
            aria-labelledby={artifactsName}
          >
            {ARTIFACT_CHOICES.map((choice) => (
              <label key={choice.id} className={styles.radio}>
                <input
                  type="radio"
                  name={artifactsName}
                  value={choice.id}
                  checked={filters.artifacts === choice.id}
                  onChange={() => {
                    set("artifacts")(choice.id);
                  }}
                />
                <span>{choice.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className={styles.row}>
        <SearchField value={filters.search} onChange={setSearch} />
        <NumberField
          label="Min profit"
          value={filters.minProfit}
          min={-MAX_PROFIT}
          max={MAX_PROFIT}
          onChange={set("minProfit")}
        />
        <NumberField
          label="Min margin %"
          value={filters.minMarginPercent}
          min={-100}
          max={MAX_MARGIN_PERCENT}
          onChange={set("minMarginPercent")}
        />
        <div className={styles.checks}>
          <Checkbox
            label="Hide crafts with missing prices"
            checked={filters.hideIncomplete}
            onChange={set("hideIncomplete")}
          />
          <Checkbox
            label="Specialty only"
            checked={filters.specialtyOnly}
            onChange={set("specialtyOnly")}
          />
        </div>
      </div>
      <details className={styles.categories}>
        <summary className={styles.summary}>
          Category
          {categoryCount > 0 && (
            <span className={styles.count}> · {categoryCount} chosen</span>
          )}
        </summary>
        <div className={styles.groups}>
          <CategoryGroup
            label="Weapon"
            options={WEAPON_TYPES}
            chosen={filters.categories}
            onSet={setCategories}
            className={styles.weapons}
          />
          <ArmorGrid chosen={filters.categories} onSet={setCategories} />
          <CategoryGroup
            label="Offhand"
            options={OFFHAND_TYPES}
            chosen={filters.categories}
            onSet={setCategories}
          />
        </div>
      </details>
      {chips.length > 0 && (
        <div className={styles.active}>
          <ul className={styles.chips} aria-label="Active filters">
            {chips.map((chip) => (
              <li key={chip.id}>
                <button
                  type="button"
                  className={styles.chip}
                  aria-label={`Remove filter: ${chip.label}`}
                  onClick={() => {
                    onChange(chip.remove);
                  }}
                >
                  {chip.label}
                  <svg
                    className={styles.cross}
                    viewBox="0 0 10 10"
                    aria-hidden="true"
                  >
                    <path d="M2 2l6 6M8 2L2 8" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className={styles.clear}
            onClick={() => {
              onChange(() => NO_FILTERS);
            }}
          >
            Clear all
          </button>
        </div>
      )}
      {!persistent && (
        <p className={styles.note}>
          This browser can’t save your filters, but the page’s link keeps them.
        </p>
      )}
    </section>
  );
}
