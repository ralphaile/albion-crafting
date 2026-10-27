// AODP's dates are in UTC but don't say so, and a date without a zone reads as local time.
export function parseAodpDate(date: string): number {
  return Date.parse(date.endsWith("Z") ? date : `${date}Z`);
}
