import { useId, useRef, useState } from "react";

import { craftingTrees } from "@aoc/crafting-data";

import { ItemIcon } from "./ItemIcon";
import { SidePanel } from "./SidePanel";
import {
  MAX_SPECIALIZATION_LEVEL,
  TREE_GROUPS,
} from "./specializations.constants";
import {
  treeLevels,
  withEverySpecialization,
  withLevel,
} from "./specializations.helpers";
import { parseSpecializations } from "./specializations.schema";
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
  iconId,
  value,
  onChange,
}: {
  label: string;
  iconId?: string;
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
      <label htmlFor={id} className={styles.name}>
        {iconId !== undefined && (
          <span className={styles.itemIcon}>
            <ItemIcon id={iconId} />
          </span>
        )}
        {label}
      </label>
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
const FILE_NAME = "specializations.json";

function download(profile: SpecializationProfile) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(profile, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = FILE_NAME;
  link.click();
  URL.revokeObjectURL(url);
}

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
  const everyFieldId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [every, setEvery] = useState("");
  const [message, setMessage] = useState("");
  const tree = craftingTrees.find(({ id }) => id === treeId);
  const levels = treeLevels(profile, treeId);
  const everyLevel = parseLevel(every);
  const setLevel = (specializationId: string | undefined, level: number) => {
    setMessage("");
    onChange(withLevel(profile, treeId, specializationId, level));
  };
  const importFile = async (file: File) => {
    let raw: unknown;
    try {
      raw = JSON.parse(await file.text());
    } catch {
      setMessage("That file isn't JSON");
      return;
    }
    const imported = parseSpecializations(raw);
    if (Object.keys(imported).length === 0) {
      setMessage("No specialization levels in that file");
      return;
    }
    onChange(imported);
    setMessage("Imported");
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
        onClose={() => {
          setMessage("");
          onClose();
        }}
        footer={
          <>
            <form
              className={styles.every}
              onSubmit={(event) => {
                event.preventDefault();
                if (tree !== undefined && everyLevel !== undefined) {
                  setMessage("");
                  onChange(withEverySpecialization(profile, tree, everyLevel));
                  setEvery("");
                }
              }}
            >
              <label htmlFor={everyFieldId}>Set all specs to</label>
              <input
                id={everyFieldId}
                className={styles.number}
                type="number"
                inputMode="numeric"
                step={1}
                min={0}
                max={MAX_SPECIALIZATION_LEVEL}
                value={every}
                onChange={(event) => {
                  setEvery(event.target.value);
                }}
              />
              <button
                type="submit"
                className={styles.set}
                disabled={everyLevel === undefined}
              >
                Set
              </button>
            </form>
            <button
              type="button"
              className={styles.action}
              onClick={() => {
                fileRef.current?.click();
              }}
            >
              Import
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              aria-label="Specializations file"
              hidden
              onChange={(event) => {
                const [file] = event.target.files ?? [];
                event.target.value = "";
                if (file !== undefined) {
                  void importFile(file);
                }
              }}
            />
            <button
              type="button"
              className={styles.action}
              onClick={() => {
                download(profile);
              }}
            >
              Export
            </button>
            {message !== "" && (
              <p className={styles.status} role="status">
                {message}
              </p>
            )}
          </>
        }
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
                  iconId={specialization.itemId}
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
