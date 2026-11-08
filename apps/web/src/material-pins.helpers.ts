import type { MaterialPins } from "./material-pins.types";

// Pins the material to `marketId`, or with `undefined` takes the pin away.
export function pinMaterial(
  pins: MaterialPins,
  itemId: string,
  marketId: string | undefined,
): MaterialPins {
  const others = Object.entries(pins).filter(([other]) => other !== itemId);
  return Object.fromEntries(
    marketId === undefined ? others : [...others, [itemId, marketId]],
  );
}
