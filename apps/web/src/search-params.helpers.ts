const WHOLE_NUMBER = /^-?\d+$/;

export function wholeNumber(
  params: URLSearchParams,
  name: string,
): number | undefined {
  const value = params.get(name);
  return value !== null && WHOLE_NUMBER.test(value) ? Number(value) : undefined;
}
