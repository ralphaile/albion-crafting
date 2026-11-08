import { useEffect, useId, useMemo, useRef, useState } from "react";

import {
  MAX_STORED_FOCUS,
  type PlanTotals,
  type PlannedEntry,
} from "@aoc/core";
import { type GameRecipe, itemName, searchItems } from "@aoc/crafting-data";
import type { MarketData } from "@aoc/market-prices";

import type { UsedPrice, UsedPrices } from "./best-crafts.types";
import controls from "./controls.module.css";
import { CraftingLocationBar } from "./CraftingLocationBar";
import { type FillBudget, FillFromFocus } from "./FillFromFocus";
import { formatCount, formatSilver } from "./format.helpers";
import { ItemIcon } from "./ItemIcon";
import type { ManualPrice, ManualPriceKey } from "./manual-prices.types";
import { planMissingPrices } from "./missing-prices.helpers";
import type { MissingPrice } from "./missing-prices.types";
import { wholeNumber } from "./number-input.helpers";
import { MAX_PLAN_QUANTITY } from "./plan.constants";
import type { CraftingPlan, PlanEntry } from "./plan.types";
import styles from "./PlanPage.module.css";
import { PriceBadge } from "./PriceBadge";
import { PriceField, type PriceTyping } from "./PriceField";
import { QUALITY } from "./prices.constants";
import { RECIPES_BY_ID } from "./recipes.constants";
import { placeName } from "./route.helpers";
import type { RouteChoice } from "./route.types";
import type { CraftingSettings } from "./settings.types";
import { shoppingList } from "./shopping-list.helpers";
import { ShoppingList } from "./ShoppingList";
import type { SpecializationProfile } from "./specializations.types";
import { type PlanState, usePlan } from "./usePlan";

type Location = CraftingPlan["locations"][number];

const MAX_MATCHES = 6;

const DEFAULT_STORED_FOCUS = "10000";

const MISSING: UsedPrice = { status: "missing", origin: "api" };

const DAILY_BONUSES: readonly {
  value: PlanEntry["dailyBonus"];
  label: string;
}[] = [
  { value: 0, label: "None" },
  { value: 0.1, label: "10%" },
  { value: 0.2, label: "20%" },
];

// Every enchantment of the same item, lowest first.
const VARIANTS = new Map<string, GameRecipe[]>();
for (const recipe of RECIPES_BY_ID.values()) {
  VARIANTS.set(recipe.baseId, [...(VARIANTS.get(recipe.baseId) ?? []), recipe]);
}
for (const variants of VARIANTS.values()) {
  variants.sort((a, b) => a.enchant - b.enchant);
}

const REMOVE_ICON = (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>
);

function cx(...names: (string | false | undefined)[]) {
  return names.filter(Boolean).join(" ");
}

function newId(): string {
  return crypto.randomUUID();
}

// The name without its tier, which a chip or the enchantment field shows.
function baseName(itemId: string): string {
  return itemName(itemId).replace(/ \d\.\d$/, "");
}

// The materials that tell each of an item's recipes apart, such as the
// artifact or the token used instead.
function recipeNames(recipe: GameRecipe): string[] {
  const variants = [recipe, ...recipe.alternatives];
  const inEvery = (itemId: string) =>
    variants.every(({ materials }) =>
      materials.some(({ id }) => id === itemId),
    );
  return variants.map(({ materials }) =>
    materials
      .map(({ id }) => id)
      .filter((id) => !inEvery(id))
      .map(itemName)
      .join(" + "),
  );
}

function Totals({
  totals,
  label,
  compact = false,
}: {
  totals: PlanTotals;
  label: string;
  compact?: boolean;
}) {
  return (
    <dl
      className={compact ? styles.subtotals : styles.totals}
      aria-label={label}
    >
      <div>
        <dt>Silver to invest</dt>
        <dd>{formatSilver(totals.cost)}</dd>
      </div>
      <div>
        <dt>Focus</dt>
        <dd>{formatCount(totals.focus)}</dd>
      </div>
      <div>
        <dt>Profit</dt>
        <dd className={totals.profit < 0 ? styles.loss : styles.profit}>
          {formatSilver(totals.profit)}
        </dd>
      </div>
    </dl>
  );
}

// Finds items by name. Each one found has a button per enchantment, which adds
// one of it.
function AddItem({ onAdd }: { onAdd: (itemId: string) => void }) {
  const [query, setQuery] = useState("");
  const inputId = useId();
  const resultsId = useId();
  const found =
    query.trim() === ""
      ? []
      : [
          ...new Set(
            searchItems(query).flatMap((id) => {
              const baseId = RECIPES_BY_ID.get(id)?.baseId;
              return baseId === undefined ? [] : [baseId];
            }),
          ),
        ].slice(0, MAX_MATCHES);
  return (
    <div className={styles.addItem}>
      <div className={styles.addFields}>
        <label htmlFor={inputId}>Add an item</label>
        <input
          id={inputId}
          type="search"
          className={styles.search}
          value={query}
          placeholder="Name, such as broadsword"
          autoComplete="off"
          aria-controls={found.length > 0 ? resultsId : undefined}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setQuery("");
            }
          }}
        />
      </div>
      {found.length > 0 && (
        <ul id={resultsId} className={styles.results} aria-label="Items found">
          {found.map((baseId) => {
            const variants = VARIANTS.get(baseId) ?? [];
            const first = variants[0];
            if (first === undefined) {
              return null;
            }
            return (
              <li key={baseId} className={styles.result}>
                <ItemIcon id={first.itemId} />
                <span className={styles.resultName}>
                  {baseName(first.itemId)}
                </span>
                <span className={styles.enchants}>
                  {variants.map((variant) => (
                    <button
                      key={variant.itemId}
                      type="button"
                      className={styles.enchantButton}
                      data-enchant={variant.enchant}
                      aria-label={`Add ${itemName(variant.itemId)}`}
                      title={`Add ${itemName(variant.itemId)}`}
                      onClick={() => {
                        onAdd(variant.itemId);
                        setQuery("");
                      }}
                    >
                      {variant.tier}.{variant.enchant}
                    </button>
                  ))}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// Keeps what's typed, even empty or out of range, and only changes the plan
// with a whole number in range. Leaving the field puts back the plan's.
function QuantityInput({
  name,
  quantity,
  onChange,
}: {
  name: string;
  quantity: number;
  onChange: (quantity: number) => void;
}) {
  const [draft, setDraft] = useState<string>();
  const step = (by: number) => {
    setDraft(undefined);
    onChange(Math.min(MAX_PLAN_QUANTITY, Math.max(1, quantity + by)));
  };
  return (
    <span className={controls.stepper}>
      <button
        type="button"
        aria-label={`One fewer ${name}`}
        disabled={quantity <= 1}
        onClick={() => {
          step(-1);
        }}
      >
        −
      </button>
      <input
        aria-label={`Quantity of ${name}`}
        type="number"
        min={1}
        max={MAX_PLAN_QUANTITY}
        value={draft ?? quantity}
        onChange={(event) => {
          const text = event.target.value;
          setDraft(text);
          const typed = Number(text);
          if (
            text.trim() !== "" &&
            Number.isInteger(typed) &&
            typed >= 1 &&
            typed <= MAX_PLAN_QUANTITY
          ) {
            onChange(typed);
          }
        }}
        onBlur={() => {
          setDraft(undefined);
        }}
      />
      <button
        type="button"
        aria-label={`One more ${name}`}
        disabled={quantity >= MAX_PLAN_QUANTITY}
        onClick={() => {
          step(1);
        }}
      >
        +
      </button>
    </span>
  );
}

function EntryRow({
  entry,
  route,
  planned,
  prices,
  typing,
  updating,
  onChange,
  onRemove,
}: {
  entry: PlanEntry;
  route: Location["route"];
  planned: PlannedEntry | undefined;
  prices: UsedPrices | undefined;
  typing: PriceTyping;
  updating: boolean;
  onChange: (entry: PlanEntry) => void;
  onRemove: () => void;
}) {
  const recipe = RECIPES_BY_ID.get(entry.itemId);
  if (recipe === undefined) {
    return null;
  }
  const name = itemName(entry.itemId);
  const variants = VARIANTS.get(recipe.baseId) ?? [recipe];
  const usedPrice = (itemId: string, side: "materials" | "products") =>
    prices?.[side].find((price) => price.itemId === itemId);
  const evaluation = planned?.evaluation;
  const priceKey = (
    itemId: string,
    marketId: string,
    source: ManualPriceKey["source"],
  ): ManualPriceKey => ({
    region: typing.region,
    itemId,
    marketId,
    quality: QUALITY,
    source,
  });
  const sellPrice =
    (evaluation &&
      usedPrice(entry.itemId, "products")?.[evaluation.revenue.source]) ??
    MISSING;
  return (
    <tr>
      <th scope="row" className={styles.item} aria-label={name}>
        <span className={styles.itemInner}>
          <ItemIcon id={entry.itemId} />
          <span className={styles.itemText}>
            <span className={styles.nameLine}>
              <span className={styles.name} title={name}>
                {baseName(entry.itemId)}
              </span>
              <select
                aria-label={`Enchantment of ${name}`}
                className={cx(controls.select, styles.enchant)}
                data-enchant={recipe.enchant}
                value={entry.itemId}
                onChange={(event) => {
                  onChange({
                    ...entry,
                    itemId: event.target.value,
                    alternative: 0,
                  });
                }}
              >
                {variants.map((variant) => (
                  <option key={variant.itemId} value={variant.itemId}>
                    {variant.tier}.{variant.enchant}
                  </option>
                ))}
              </select>
            </span>
            {recipe.alternatives.length > 0 && (
              <select
                aria-label={`Recipe for ${name}`}
                className={cx(controls.select, styles.recipe)}
                value={entry.alternative}
                onChange={(event) => {
                  onChange({
                    ...entry,
                    alternative: Number(event.target.value),
                  });
                }}
              >
                {recipeNames(recipe).map((label, index) => (
                  <option key={index} value={index}>
                    {label}
                  </option>
                ))}
              </select>
            )}
          </span>
        </span>
      </th>
      <td data-label="Quantity">
        <QuantityInput
          name={name}
          quantity={entry.quantity}
          onChange={(quantity) => {
            onChange({ ...entry, quantity });
          }}
        />
      </td>
      <td data-label="Focus">
        <input
          aria-label={`Use focus for ${name}`}
          type="checkbox"
          className={controls.toggle}
          checked={entry.focus}
          onChange={(event) => {
            onChange({ ...entry, focus: event.target.checked });
          }}
        />
      </td>
      <td data-label="Daily bonus">
        <fieldset className={controls.segmented}>
          <legend className={styles.hidden}>Daily bonus for {name}</legend>
          {DAILY_BONUSES.map(({ value, label }) => (
            <label key={value}>
              <input
                type="radio"
                name={`daily-bonus-${entry.id}`}
                checked={entry.dailyBonus === value}
                onChange={() => {
                  onChange({ ...entry, dailyBonus: value });
                }}
              />
              {label}
            </label>
          ))}
        </fieldset>
      </td>
      <td data-label="Materials to buy">
        {planned && (
          <ul className={styles.materials} aria-label={`Materials for ${name}`}>
            {planned.materials.map(({ itemId, count }) => {
              const price = usedPrice(itemId, "materials");
              const line = evaluation?.materialCost.lines.find(
                (l) => l.itemId === itemId,
              );
              return (
                <li key={itemId}>
                  <ItemIcon id={itemId} />
                  <PriceBadge price={(line && price?.[line.source]) ?? MISSING}>
                    {formatCount(count)} × {itemName(itemId)}
                  </PriceBadge>
                </li>
              );
            })}
          </ul>
        )}
      </td>
      <td data-label="Focus cost" className={styles.number}>
        {planned ? formatCount(planned.focus) : ""}
      </td>
      <td data-label="Station fee" className={styles.number}>
        {planned && evaluation?.stationFee !== undefined
          ? formatSilver(evaluation.stationFee * planned.crafts)
          : ""}
      </td>
      <td data-label="Sell price" className={styles.number}>
        {evaluation && (
          <span className={styles.sellPrice}>
            <PriceBadge price={sellPrice} announceName>
              {null}
            </PriceBadge>
            <PriceField
              label={`Sell price of ${name}`}
              priceKey={priceKey(
                entry.itemId,
                route.sellMarketId,
                evaluation.revenue.source,
              )}
              price={
                sellPrice.status === "missing" ? undefined : sellPrice.value
              }
              typing={typing}
            />
          </span>
        )}
      </td>
      <td data-label="Profit" className={styles.number}>
        {planned?.status === "complete" ? (
          <span className={planned.profit < 0 ? styles.loss : styles.profit}>
            {formatSilver(planned.profit)}
          </span>
        ) : updating ? (
          <span className={styles.loading}>Loading prices…</span>
        ) : planned ? (
          <span className={styles.missing}>Prices missing</span>
        ) : (
          ""
        )}
      </td>
      <td className={styles.removeCell}>
        <button
          type="button"
          className={controls.iconButton}
          onClick={onRemove}
          aria-label={`Remove ${name}`}
          title="Remove"
        >
          {REMOVE_ICON}
        </button>
      </td>
    </tr>
  );
}

function LocationSection({
  location,
  index,
  state,
  typing,
  onChange,
  onRemove,
}: {
  location: Location;
  index: number;
  state: PlanState;
  typing: PriceTyping;
  onChange: (location: Location) => void;
  onRemove: () => void;
}) {
  const label = `Location ${String(index + 1)}`;
  const planned =
    state.status === "ready" ? state.result.locations[index] : undefined;
  const prices = state.status === "ready" ? state.prices[index] : undefined;
  const updating = state.status !== "ready" || state.updating;
  const setEntry = (entryIndex: number, entry: PlanEntry) => {
    onChange({
      ...location,
      entries: location.entries.map((other, i) =>
        i === entryIndex ? entry : other,
      ),
    });
  };
  return (
    <section className={styles.location} aria-label={label}>
      <div className={styles.locationHead}>
        <h3>
          <span className={styles.index}>{index + 1}</span>
          {placeName(location.route.place)}
        </h3>
        {planned && location.entries.length > 0 && (
          <Totals totals={planned.totals} label={`${label} totals`} compact />
        )}
        <button
          type="button"
          className={controls.iconButton}
          onClick={onRemove}
          aria-label={`Remove ${label.toLowerCase()}`}
          title="Remove location"
        >
          {REMOVE_ICON}
        </button>
      </div>
      <CraftingLocationBar
        route={location.route}
        onChange={(route) => {
          onChange({ ...location, route });
        }}
      />
      {location.entries.length > 0 && (
        <table className={styles.entries}>
          <thead>
            <tr>
              <th scope="col">Item</th>
              <th scope="col">Quantity</th>
              <th scope="col">Focus</th>
              <th scope="col">Daily bonus</th>
              <th scope="col">Materials to buy</th>
              <th scope="col" className={styles.number}>
                Focus cost
              </th>
              <th scope="col" className={styles.number}>
                Station fee
              </th>
              <th scope="col" className={styles.number}>
                Sell price
              </th>
              <th scope="col" className={styles.number}>
                Profit
              </th>
              <th scope="col">
                <span className={styles.hidden}>Remove</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {location.entries.map((entry, entryIndex) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                route={location.route}
                planned={planned?.entries[entryIndex]}
                prices={prices}
                typing={typing}
                updating={updating}
                onChange={(next) => {
                  setEntry(entryIndex, next);
                }}
                onRemove={() => {
                  onChange({
                    ...location,
                    entries: location.entries.filter(
                      (other) => other.id !== entry.id,
                    ),
                  });
                }}
              />
            ))}
          </tbody>
        </table>
      )}
      <AddItem
        onAdd={(itemId) => {
          onChange({
            ...location,
            entries: [
              ...location.entries,
              {
                id: newId(),
                itemId,
                alternative: 0,
                quantity: 1,
                focus: true,
                dailyBonus: 0,
              },
            ],
          });
        }}
      />
    </section>
  );
}

export function PlanPage({
  marketData,
  plan,
  onChange,
  route,
  settings,
  manualPrices,
  onSaveManualPrice,
  onRemoveManualPrice,
  onMissingPrices,
  specializations,
  onFill,
  fillUnavailable,
}: {
  marketData: MarketData;
  plan: CraftingPlan;
  onChange: (plan: CraftingPlan) => void;
  route: RouteChoice;
  settings: CraftingSettings;
  manualPrices: readonly ManualPrice[];
  onSaveManualPrice: (price: ManualPrice) => void;
  onRemoveManualPrice: (key: ManualPriceKey) => void;
  onMissingPrices?: (missing: readonly MissingPrice[]) => void;
  specializations: SpecializationProfile;
  onFill?: (budget: FillBudget) => number;
  fillUnavailable?: string;
}) {
  const state = usePlan(
    marketData,
    plan,
    settings,
    manualPrices,
    specializations,
  );
  // While prices are coming, the list keeps the last ones known.
  const missing = useMemo(
    () =>
      state.status === "ready" && !state.updating
        ? planMissingPrices(plan, state.result, {
            region: settings.server,
            quality: QUALITY,
          })
        : undefined,
    [plan, state, settings.server],
  );
  // Told only when the list changes, since each new plan state makes a new one.
  const reported = useRef<string>(undefined);
  useEffect(() => {
    if (missing === undefined) {
      return;
    }
    const listed = JSON.stringify(missing);
    if (listed !== reported.current) {
      reported.current = listed;
      onMissingPrices?.(missing);
    }
  }, [missing, onMissingPrices]);
  const typing: PriceTyping = {
    region: settings.server,
    manualPrices,
    onSave: onSaveManualPrice,
    onRemove: onRemoveManualPrice,
  };
  const [stored, setStored] = useState(DEFAULT_STORED_FOCUS);
  const storedFocus = wholeNumber(stored, 0, MAX_STORED_FOCUS);
  const storedId = useId();
  const setLocation = (index: number, location: Location) => {
    onChange({
      locations: plan.locations.map((other, i) =>
        i === index ? location : other,
      ),
    });
  };
  return (
    <section className={styles.plan} aria-label="Crafting plan">
      <div className={styles.planHead}>
        <h2>Crafting plan</h2>
        <button
          type="button"
          className={cx(controls.button, controls.primary)}
          onClick={() => {
            onChange({
              locations: [
                ...plan.locations,
                { id: newId(), route, entries: [] },
              ],
            });
          }}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 3v10M3 8h10" />
          </svg>
          Add location
        </button>
      </div>
      <div className={styles.toolbar}>
        <label htmlFor={storedId}>Focus you have</label>
        <input
          id={storedId}
          type="number"
          min={0}
          max={MAX_STORED_FOCUS}
          value={stored}
          onChange={(event) => {
            setStored(event.target.value);
          }}
        />
        {onFill && (
          <FillFromFocus
            focus={storedFocus}
            onFill={onFill}
            unavailable={fillUnavailable}
          />
        )}
      </div>
      {state.status === "ready" && (
        <Totals totals={state.result.totals} label="Plan totals" />
      )}
      {(state.status === "error" ||
        (state.status === "ready" && state.failed)) && (
        <p role="alert">
          Couldn’t fetch prices from the Albion Online Data Project.
        </p>
      )}
      {plan.locations.map((location, index) => (
        <LocationSection
          key={location.id}
          location={location}
          index={index}
          state={state}
          typing={typing}
          onChange={(next) => {
            setLocation(index, next);
          }}
          onRemove={() => {
            onChange({
              locations: plan.locations.filter(
                (other) => other.id !== location.id,
              ),
            });
          }}
        />
      ))}
      {state.status === "ready" && (
        <ShoppingList
          markets={shoppingList(plan, state.result)}
          typing={typing}
        />
      )}
    </section>
  );
}
