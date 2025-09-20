/**
 * Converts a date string to a Date object.
 * @param isoString - The ISO date string to be parsed.
 * @returns {Date} - The parsed date object.
 */
export const parseISODate = (isoString: string) => {
  const date = new Date(isoString);
  return new Date(date.getTime() + date.getTimezoneOffset() * 60000);
};
