const MINUS_SIGN = "\u2212";

function formatter(options: Intl.NumberFormatOptions) {
  const format = new Intl.NumberFormat("en-US", {
    signDisplay: "negative",
    ...options,
  });
  return (value: number) => format.format(value).replace("-", MINUS_SIGN);
}

export const formatSilver = formatter({ maximumFractionDigits: 0 });

export const formatCount = formatter({ maximumFractionDigits: 0 });

export const formatQuantity = formatter({ maximumFractionDigits: 2 });

export const formatPercent = formatter({
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export const formatReturnRate = formatter({
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatSilverPerFocus = formatter({
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatAge(minutes: number): string {
  if (minutes < 60) {
    return `${String(minutes)} min`;
  }
  if (minutes < 48 * 60) {
    return `${String(Math.floor(minutes / 60))} h`;
  }
  return `${String(Math.floor(minutes / (24 * 60)))} d`;
}

export function formatAgo(minutes: number): string {
  return minutes < 1 ? "just now" : `${formatAge(minutes)} ago`;
}
