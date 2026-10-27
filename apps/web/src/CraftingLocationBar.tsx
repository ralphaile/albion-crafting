import { type ReactNode, useState } from "react";

import { hideouts } from "@aoc/crafting-data";

import styles from "./CraftingLocationBar.module.css";
import { formatReturnRate } from "./format.helpers";
import { placeReturnRates } from "./return-rates.helpers";
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
  children,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  className: string | undefined;
  children: ReactNode;
}) {
  return (
    <label className={[styles.field, className].join(" ")}>
      <span className={styles.label}>{label}</span>
      <select
        className={styles.select}
        value={value}
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

function Rate({
  term,
  value,
  className,
}: {
  term: string;
  value: number;
  className: string | undefined;
}) {
  return (
    <div className={className}>
      <dt>{term}</dt>
      <dd>{formatReturnRate(value)}</dd>
    </div>
  );
}

function ReturnRateLine({ place }: { place: PlaceChoice }) {
  const { base, specialty } = placeReturnRates(placeFromChoice(place));
  return (
    <div className={styles.rates}>
      <dl className={styles.rateList}>
        <Rate
          term="Return rate"
          value={base.withoutFocus}
          className={undefined}
        />
        {specialty && (
          <Rate
            term="Specialty"
            value={specialty.withoutFocus}
            className={styles.specialty}
          />
        )}
        <Rate
          term="With focus"
          value={base.withFocus}
          className={styles.focus}
        />
        {specialty && (
          <Rate
            term="Specialty"
            value={specialty.withFocus}
            className={styles.specialty}
          />
        )}
      </dl>
      {!specialty && <p className={styles.none}>No specialties</p>}
    </div>
  );
}

export function CraftingLocationBar({
  route,
  onChange,
}: {
  route: RouteChoice;
  onChange: (route: RouteChoice) => void;
}) {
  const { place } = route;
  const [lastHideout, setLastHideout] = useState<HideoutChoice>();

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
        onChange={(sellMarketId) => {
          onChange({ ...route, sellMarketId });
        }}
      >
        <GroupedOptions groups={SELL_MARKET_GROUPS} />
      </Select>
      <ReturnRateLine place={place} />
    </section>
  );
}
