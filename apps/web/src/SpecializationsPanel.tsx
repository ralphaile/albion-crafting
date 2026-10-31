import { useId, useState } from "react";

import { craftingTrees } from "@aoc/crafting-data";

import { SidePanel } from "./SidePanel";
import {
  MAX_SPECIALIZATION_LEVEL,
  TREE_GROUPS,
} from "./specializations.constants";
import { treeLevels, withLevel } from "./specializations.helpers";
import type { SpecializationProfile } from "./specializations.types";
import styles from "./SpecializationsPanel.module.css";

function parseLevel(text: string) {
  const value = Number(text);
  return text.trim() !== "" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= MAX_SPECIALIZATION_LEVEL
    ? value
    : undefined;
}

function Level({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (level: number) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState({ text: String(value), value });
  if (draft.value !== value) {
    setDraft({ text: String(value), value });
  }
  return (
    <li className={styles.level}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        className={styles.number}
        type="number"
        inputMode="numeric"
        step={1}
        min={0}
        max={MAX_SPECIALIZATION_LEVEL}
        value={draft.text}
        onChange={(event) => {
          const text = event.target.value;
          const parsed = parseLevel(text);
          setDraft({ text, value: parsed ?? draft.value });
          if (parsed !== undefined && parsed !== value) {
            onChange(parsed);
          }
        }}
        onBlur={() => {
          setDraft({ text: String(value), value });
        }}
      />
    </li>
  );
}

// The owner keeps whether it's open and which tree it shows, so a craft's
// panel can open it on that craft's tree.
export function SpecializationsPanel({
  profile,
  onChange,
  open,
  treeId,
  onShow,
  onClose,
}: {
  profile: SpecializationProfile;
  onChange: (profile: SpecializationProfile) => void;
  open: boolean;
  treeId: string;
  onShow: (treeId: string) => void;
  onClose: () => void;
}) {
  const treeFieldId = useId();
  const tree = craftingTrees.find(({ id }) => id === treeId);
  const levels = treeLevels(profile, treeId);
  const setLevel = (specializationId: string | undefined, level: number) => {
    onChange(withLevel(profile, treeId, specializationId, level));
  };

  return (
    <>
      <button
        type="button"
        className={styles.open}
        aria-haspopup="dialog"
        onClick={() => {
          onShow(treeId);
        }}
      >
        <svg className={styles.icon} viewBox="0 0 16 16" aria-hidden="true">
          <path d="M8 14.5V8M8 8L3.5 4.5M8 8l4.5-3.5M8 8V2.5" />
          <circle cx="8" cy="2.5" r="1.5" />
          <circle cx="3.5" cy="4.5" r="1.5" />
          <circle cx="12.5" cy="4.5" r="1.5" />
        </svg>
        <span className={styles.openLabel}>Specializations</span>
      </button>
      <SidePanel
        heading="Specializations"
        closeLabel="Close specializations"
        open={open}
        onClose={onClose}
      >
        <div className={styles.tree}>
          <label htmlFor={treeFieldId} className={styles.label}>
            Tree
          </label>
          <select
            id={treeFieldId}
            className={styles.select}
            value={treeId}
            onChange={(event) => {
              onShow(event.target.value);
            }}
          >
            {TREE_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        {tree !== undefined && (
          <>
            <ul className={styles.levels}>
              <Level
                key={`${treeId} mastery`}
                label="Mastery"
                value={levels.mastery}
                onChange={(level) => {
                  setLevel(undefined, level);
                }}
              />
            </ul>
            <ul className={styles.levels}>
              {tree.specializations.map((specialization) => (
                <Level
                  key={`${treeId} ${specialization.id}`}
                  label={specialization.name}
                  value={levels.specializations[specialization.id] ?? 0}
                  onChange={(level) => {
                    setLevel(specialization.id, level);
                  }}
                />
              ))}
            </ul>
          </>
        )}
      </SidePanel>
    </>
  );
}
