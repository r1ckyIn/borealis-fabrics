/**
 * Parse URL parameter to entity ID with NaN validation.
 * Returns undefined if the value is not a valid positive integer.
 */
export function parseEntityId(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? undefined : parsed;
}
