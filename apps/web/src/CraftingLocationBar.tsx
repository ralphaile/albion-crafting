import { type ReactNode, useId, useState } from "react";

import { hideouts } from "@aoc/crafting-data";
import { markets } from "@aoc/market-prices";

import { bonusPreview } from "./bonus-preview.helpers";
import type { BonusRow } from "./bonus-preview.types";
import styles from "./CraftingLocationBar.module.css";
import { formatBonus, formatReturnRate } from "./format.helpers";
import {
  BUY_MARKET_GROUPS,
  LOCATION_GROUPS,
  SELL_MARKET_GROUPS,
} from "./route.constants";
import { defaultHideoutFor, placeFromChoice } from "./route.helpers";
import type {
  HideoutChoice,
  OptionGroup,
  PlaceChoice,
  RouteChoice,
} from "./route.types";

const HIDEOUT = "hideout";

function Select({
  label,
  value,
  onChange,
  className,
  describedBy,
  children,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  className: string | undefined;
  describedBy?: string | undefined;
  children: ReactNode;
}) {
  return (
    <label className={[styles.field, className].join(" ")}>
      <span className={styles.label}>{label}</span>
      <select
        className={styles.select}
        value={value}
        aria-describedby={describedBy}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      >
        {children}
      </select>
    </label>
  );
}

function GroupedOptions({ groups }: { groups: readonly OptionGroup[] }) {
  return groups.map((group) => (
    <optgroup key={group.label} label={group.label}>
      {group.options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </optgroup>
  ));
}

function HideoutFields({
  hideout,
  onChange,
}: {
  hideout: HideoutChoice;
  onChange: (hideout: HideoutChoice) => void;
}) {
  return (
    <>
      <Select
        label="Biome"
        className={styles.biome}
        value={hideout.biomeId}
        onChange={(biomeId) => {
          onChange({ ...hideout, biomeId });
        }}
      >
        {hideouts.biomes.map(({ id, name }) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </Select>
      <Select
        label="Map quality"
        className={styles.quality}
        value={hideout.quality}
        onChange={(quality) => {
          onChange({ ...hideout, quality: Number(quality) });
        }}
      >
        {hideouts.mapQualities.map(({ quality }) => (
          <option key={quality} value={quality}>
            Q{quality}
          </option>
        ))}
      </Select>
      <Select
        label="Power level"
        className={styles.level}
        value={hideout.level}
        onChange={(level) => {
          onChange({ ...hideout, level: Number(level) });
        }}
      >
        {hideouts.powerLevels.map(({ level }) => (
          <option key={level} value={level}>
            {level}
          </option>
        ))}
      </Select>
    </>
  );
}

function BonusCells({ row }: { row: BonusRow }) {
  return (
    <>
      <td>{formatBonus(row.bonus)}</td>
      <td className={styles.rate}>{formatReturnRate(row.returnRate)}</td>
      <td>{formatBonus(row.bonusWithFocus)}</td>
      <td className={styles.rate}>
        {formatReturnRate(row.returnRateWithFocus)}
      </td>
    </>
  );
}

function BonusTable({ place }: { place: PlaceChoice }) {
  const { base, specialty } = bonusPreview(placeFromChoice(place));
  return (
    <table
      className={styles.preview}
      aria-label="Production bonus and return rate"
    >
      <thead>
        <tr>
          <td />
          <th scope="colgroup" colSpan={2}>
            Without focus
          </th>
          <th scope="colgroup" colSpan={2}>
            With focus
          </th>
        </tr>
        <tr>
          <td />
          <th scope="col">Bonus</th>
          <th scope="col">Return rate</th>
          <th scope="col">Bonus</th>
          <th scope="col">Return rate</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">Base</th>
          <BonusCells row={base} />
        </tr>
        <tr className={styles.specialty}>
          <th scope="row">Specialty</th>
          {specialty ? (
            <BonusCells row={specialty} />
          ) : (
            <td colSpan={4} className={styles.none}>
              No specialties
            </td>
          )}
        </tr>
      </tbody>
    </table>
  );
}

export function CraftingLocationBar({
  route,
  onChange,
}: {
  route: RouteChoice;
  onChange: (route: RouteChoice) => void;
}) {
  const noteId = useId();
  const { place } = route;
  const [lastHideout, setLastHideout] = useState<HideoutChoice>();
  const sellsToBlackMarket = markets.some(
    ({ id, sellOnly }) => id === route.sellMarketId && sellOnly === true,
  );

  const choosePlace = (next: PlaceChoice) => {
    onChange({ ...route, place: next });
  };
  const chooseLocation = (locationId: string) => {
    if (locationId !== HIDEOUT) {
      if (place.kind === "hideout") {
        setLastHideout(place);
      }
      choosePlace({ kind: "location", locationId });
    } else if (place.kind === "location") {
      choosePlace(lastHideout ?? defaultHideoutFor(place));
    }
  };

  return (
    <section className={styles.bar} aria-label="Where you craft, buy and sell">
      <Select
        label="Crafting location"
        className={styles.location}
        value={place.kind === "hideout" ? HIDEOUT : place.locationId}
        onChange={chooseLocation}
      >
        <option value={HIDEOUT}>Hideout</option>
        <GroupedOptions groups={LOCATION_GROUPS} />
      </Select>
      {place.kind === "hideout" && (
        <HideoutFields hideout={place} onChange={choosePlace} />
      )}
      <Select
        label="Buy materials in"
        className={styles.buy}
        value={route.buyMarketId}
        onChange={(buyMarketId) => {
          onChange({ ...route, buyMarketId });
        }}
      >
        <GroupedOptions groups={BUY_MARKET_GROUPS} />
      </Select>
      <Select
        label="Sell in"
        className={styles.sell}
        value={route.sellMarketId}
        describedBy={sellsToBlackMarket ? noteId : undefined}
        onChange={(sellMarketId) => {
          onChange({ ...route, sellMarketId });
        }}
      >
        <GroupedOptions groups={SELL_MARKET_GROUPS} />
      </Select>
      {sellsToBlackMarket && (
        <p id={noteId} className={styles.note}>
          Priced at its highest buy order
        </p>
      )}
      <div className={styles.previewArea}>
        <BonusTable place={place} />
      </div>
    </section>
  );
}
