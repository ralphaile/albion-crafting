// The market a material is always bought in, by item ID with its tier and
// enchantment, whatever the route's markets are.
export type MaterialPins = Readonly<Record<string, string>>;

// `undefined` takes the pin away.
export type PinMaterialHandler = (
  itemId: string,
  marketId: string | undefined,
) => void;
