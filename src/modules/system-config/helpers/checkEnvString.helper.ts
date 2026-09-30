export function checkEnvString(
  value: string | undefined,
  columnName: string,
): void {
  if (value === undefined) {
    throw new Error(`ERROR: column ${columnName} is undefined`);
  }

  if (typeof value !== 'string') {
    throw new Error(`ERROR: column ${columnName} is invalid`);
  }

  if (value.trim() === '') {
    throw new Error(`ERROR: column ${columnName} is invalid`);
  }
}
