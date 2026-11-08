import { type ReactNode, useId, useRef, useState } from "react";

import { hideouts } from "@aoc/crafting-data";

import styles from "./CraftingLocationBar.module.css";
import { formatReturnRate } from "./format.helpers";
import {
  REFINED_MATERIALS,
  REFINING_CITY_MARKETS,
} from "./material-markets.constants";
import { sameMaterialMarkets } from "./material-markets.helpers";
import { placeReturnRates } from "./return-rates.helpers";
import {
  BUY_MARKET_GROUPS,
  LOCATION_GROUPS,
  SELL_MARKET_GROUPS,
} from "./route.constants";
import {
  defaultHideoutFor,
  marketName,
  placeFromChoice,
} from "./route.helpers";
import type {
  BuyMarkets,
  HideoutChoice,
  OptionGroup,
  PlaceChoice,
  RouteChoice,
} from "./route.types";
import { useDismiss } from "./useDismiss";

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

// The button names the market for everything else, and how many refined
// materials are bought elsewhere.
function BuyMarketsPicker({
  markets,
  onChange,
}: {
  markets: BuyMarkets;
  onChange: (markets: BuyMarkets) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const labelId = useId();
  const popoverId = useId();
  useDismiss(
    open,
    () => {
      setOpen(false);
    },
    wrapRef,
    buttonRef,
  );
  const { buyMarketId, materialMarkets } = markets;
  const elsewhere = REFINED_MATERIALS.filter(
    ({ id }) => materialMarkets[id] !== buyMarketId,
  ).length;
  const presets = sameMaterialMarkets(materialMarkets, REFINING_CITY_MARKETS);

  return (
    <div ref={wrapRef} className={[styles.field, styles.buy].join(" ")}>
      <span id={labelId} className={styles.label}>
        Buy materials in
      </span>
      <button
        ref={buttonRef}
        type="button"
        className={styles.select}
        aria-labelledby={labelId}
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        onClick={() => {
          setOpen((was) => !was);
        }}
      >
        {marketName(buyMarketId)}
        {elsewhere > 0 && ` +${String(elsewhere)}`}
      </button>
      {open && (
        <div
          id={popoverId}
          role="group"
          aria-label="Where materials are bought"
          className={styles.popover}
        >
          <Select
            label="Everything else"
            className={styles.everythingElse}
            value={buyMarketId}
            onChange={(marketId) => {
              onChange({ ...markets, buyMarketId: marketId });
            }}
          >
            <GroupedOptions groups={BUY_MARKET_GROUPS} />
          </Select>
          {REFINED_MATERIALS.map(({ id, label }) => (
            <Select
              key={id}
              label={label}
              className={undefined}
              value={materialMarkets[id]}
              onChange={(marketId) => {
                onChange({
                  ...markets,
                  materialMarkets: { ...materialMarkets, [id]: marketId },
                });
              }}
            >
              <GroupedOptions groups={BUY_MARKET_GROUPS} />
            </Select>
          ))}
          <button
            type="button"
            className={styles.reset}
            disabled={presets}
            onClick={() => {
              onChange({ ...markets, materialMarkets: REFINING_CITY_MARKETS });
            }}
          >
            Refining cities
          </button>
        </div>
      )}
    </div>
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
      <BuyMarketsPicker
        markets={route}
        onChange={(markets) => {
          onChange({ ...route, ...markets });
        }}
      />
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
