export function formatDate(dateValue: Date): string {
  const date = new Date(dateValue);

  if (isNaN(date.valueOf()) === true) {
    throw new Error(`(formatDate) error dateValue with is not valid`);
  }

  return date
    .toISOString()
    .replace(/T/, ' ') // replace T with a space
    .replace(/\..+/, ''); // delete the dot and everything after
}
