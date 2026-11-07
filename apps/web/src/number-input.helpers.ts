// A whole number typed in a field, or undefined when it isn't one in range.
export function wholeNumber(
  text: string,
  min: number,
  max: number,
): number | undefined {
  const value = Number(text);
  return text.trim() !== "" &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
    ? value
    : undefined;
}
