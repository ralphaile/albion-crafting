import { useId, useState } from "react";

import {
  focusDays,
  MAX_STORED_FOCUS,
  type PlanTotals,
  type PlannedEntry,
} from "@aoc/core";
import { type GameRecipe, itemName, searchItems } from "@aoc/crafting-data";
import type { MarketData } from "@aoc/market-prices";

import type { UsedPrice, UsedPrices } from "./best-crafts.types";
import { CraftingLocationBar } from "./CraftingLocationBar";
import { type FillBudget, FillFromFocus } from "./FillFromFocus";
import { formatCount, formatQuantity, formatSilver } from "./format.helpers";
import type { ManualPrice } from "./manual-prices.types";
import { wholeNumber } from "./number-input.helpers";
import { MAX_PLAN_QUANTITY } from "./plan.constants";
import type { CraftingPlan, PlanEntry } from "./plan.types";
import styles from "./PlanPage.module.css";
import { PriceBadge } from "./PriceBadge";
import { RECIPES_BY_ID } from "./recipes.constants";
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
  { value: 0.1, label: "+10%" },
  { value: 0.2, label: "+20%" },
];

// Every enchantment of the same item, lowest first.
const VARIANTS = new Map<string, GameRecipe[]>();
for (const recipe of RECIPES_BY_ID.values()) {
  VARIANTS.set(recipe.baseId, [...(VARIANTS.get(recipe.baseId) ?? []), recipe]);
}
for (const variants of VARIANTS.values()) {
  variants.sort((a, b) => a.enchant - b.enchant);
}

function newId(): string {
  return crypto.randomUUID();
}

// `days` is the days of focus the totals take, when it's known.
function Totals({
  totals,
  label,
  updating,
  days,
}: {
  totals: PlanTotals;
  label: string;
  updating: boolean;
  days?: number | undefined;
}) {
  const incomplete = totals.status === "incomplete" && !updating;
  return (
    <dl className={styles.totals} aria-label={label}>
      <div>
        <dt>Silver to invest</dt>
        <dd>{formatSilver(totals.cost)}</dd>
      </div>
      <div>
        <dt>Focus</dt>
        <dd>{formatCount(totals.focus)}</dd>
      </div>
      {days !== undefined && (
        <div>
          <dt>Days of focus</dt>
          <dd>
            {days === 0
              ? "Enough now"
              : `${formatCount(days)} ${days === 1 ? "day" : "days"}`}
          </dd>
        </div>
      )}
      <div>
        <dt>Profit</dt>
        <dd className={totals.profit < 0 ? styles.loss : undefined}>
          {formatSilver(totals.profit)}
        </dd>
      </div>
      {incomplete && (
        <div>
          <dt>Missing prices</dt>
          <dd>{totals.missingPrices.map(itemName).join(", ")}</dd>
        </div>
      )}
    </dl>
  );
}

function AddItem({ onAdd }: { onAdd: (itemId: string) => void }) {
  const [query, setQuery] = useState("");
  const inputId = useId();
  const matches =
    query.trim() === ""
      ? []
      : searchItems(query)
          .filter((id) => RECIPES_BY_ID.get(id)?.enchant === 0)
          .slice(0, MAX_MATCHES);
  return (
    <div className={styles.addItem}>
      <label htmlFor={inputId}>Add an item</label>
      <input
        id={inputId}
        type="search"
        value={query}
        placeholder="Name, such as broadsword"
        onChange={(event) => {
          setQuery(event.target.value);
        }}
      />
      {matches.length > 0 && (
        <ul className={styles.matches}>
          {matches.map((itemId) => (
            <li key={itemId}>
              <button
                type="button"
                onClick={() => {
                  onAdd(itemId);
                  setQuery("");
                }}
              >
                Add {itemName(itemId)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EntryRow({
  entry,
  planned,
  prices,
  updating,
  onChange,
  onRemove,
}: {
  entry: PlanEntry;
  planned: PlannedEntry | undefined;
  prices: UsedPrices | undefined;
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
  return (
    <tr>
      <th scope="row">{name}</th>
      <td>
        <select
          aria-label={`Enchantment of ${name}`}
          value={entry.itemId}
          onChange={(event) => {
            onChange({ ...entry, itemId: event.target.value, alternative: 0 });
          }}
        >
          {variants.map((variant) => (
            <option key={variant.itemId} value={variant.itemId}>
              .{variant.enchant}
            </option>
          ))}
        </select>
      </td>
      <td>
        <select
          aria-label={`Recipe for ${name}`}
          value={entry.alternative}
          onChange={(event) => {
            onChange({ ...entry, alternative: Number(event.target.value) });
          }}
        >
          {[recipe, ...recipe.alternatives].map((_, index) => (
            <option key={index} value={index}>
              {index === 0 ? "Usual" : `Recipe ${String(index + 1)}`}
            </option>
          ))}
        </select>
      </td>
      <td>
        <input
          aria-label={`Quantity of ${name}`}
          type="number"
          min={1}
          max={MAX_PLAN_QUANTITY}
          value={entry.quantity}
          onChange={(event) => {
            const quantity = Number(event.target.value);
            if (
              Number.isInteger(quantity) &&
              quantity >= 1 &&
              quantity <= MAX_PLAN_QUANTITY
            ) {
              onChange({ ...entry, quantity });
            }
          }}
        />
      </td>
      <td>
        <input
          aria-label={`Use focus for ${name}`}
          type="checkbox"
          checked={entry.focus}
          onChange={(event) => {
            onChange({ ...entry, focus: event.target.checked });
          }}
        />
      </td>
      <td>
        <select
          aria-label={`Daily bonus for ${name}`}
          value={entry.dailyBonus}
          onChange={(event) => {
            onChange({
              ...entry,
              dailyBonus: Number(event.target.value) as PlanEntry["dailyBonus"],
            });
          }}
        >
          {DAILY_BONUSES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </td>
      <td>
        {planned && (
          <ul className={styles.materials} aria-label={`Materials for ${name}`}>
            {planned.materials.map(({ itemId, count }) => {
              const price = usedPrice(itemId, "materials");
              const line = evaluation?.materialCost.lines.find(
                (l) => l.itemId === itemId,
              );
              return (
                <li key={itemId}>
                  <PriceBadge price={(line && price?.[line.source]) ?? MISSING}>
                    {formatQuantity(count)} × {itemName(itemId)}
                  </PriceBadge>
                </li>
              );
            })}
          </ul>
        )}
      </td>
      <td>{planned ? formatCount(planned.focus) : ""}</td>
      <td>
        {planned && evaluation?.stationFee !== undefined
          ? formatSilver(evaluation.stationFee * planned.crafts)
          : ""}
      </td>
      <td>
        {planned?.status === "complete" ? (
          <PriceBadge
            price={
              (evaluation &&
                usedPrice(entry.itemId, "products")?.[
                  evaluation.revenue.source
                ]) ??
              MISSING
            }
          >
            <span className={planned.profit < 0 ? styles.loss : undefined}>
              {formatSilver(planned.profit)}
            </span>
          </PriceBadge>
        ) : updating ? (
          "Loading prices…"
        ) : planned ? (
          <span className={styles.missing}>
            Missing: {planned.evaluation.missingPrices.map(itemName).join(", ")}
          </span>
        ) : (
          ""
        )}
      </td>
      <td>
        <button type="button" onClick={onRemove} aria-label={`Remove ${name}`}>
          Remove
        </button>
      </td>
    </tr>
  );
}

function LocationSection({
  location,
  index,
  state,
  onChange,
  onRemove,
}: {
  location: Location;
  index: number;
  state: PlanState;
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
        <h3>{label}</h3>
        <button type="button" onClick={onRemove}>
          Remove {label.toLowerCase()}
        </button>
      </div>
      <CraftingLocationBar
        route={location.route}
        onChange={(route) => {
          onChange({ ...location, route });
        }}
      />
      {location.entries.length > 0 && (
        <div className={styles.scroll}>
          <table className={styles.entries}>
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col">Enchant</th>
                <th scope="col">Recipe</th>
                <th scope="col">Quantity</th>
                <th scope="col">Focus</th>
                <th scope="col">Daily bonus</th>
                <th scope="col">Materials after returns</th>
                <th scope="col">Focus cost</th>
                <th scope="col">Station fee</th>
                <th scope="col">Profit</th>
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
                  planned={planned?.entries[entryIndex]}
                  prices={prices}
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
        </div>
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
      {planned && (
        <Totals
          totals={planned.totals}
          label={`${label} totals`}
          updating={updating}
        />
      )}
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
          onClick={() => {
            onChange({
              locations: [
                ...plan.locations,
                { id: newId(), route, entries: [] },
              ],
            });
          }}
        >
          Add location
        </button>
      </div>
      <div className={styles.focusBar}>
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
        <Totals
          totals={state.result.totals}
          label="Plan totals"
          updating={state.updating}
          days={
            storedFocus === undefined
              ? undefined
              : focusDays(state.result.totals.focus, storedFocus)
          }
        />
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
        <ShoppingList markets={shoppingList(plan, state.result)} />
      )}
    </section>
  );
}
