/**
 * Parses and clamps a limit query param. Used for pagination.
 */
export function parseLimit(
  raw: unknown,
  defaultVal: number,
  max: number
): number {
  const parsed = raw ? parseInt(String(raw), 10) : defaultVal;
  return Math.min(
    Math.max(1, Number.isNaN(parsed) ? defaultVal : parsed),
    max
  );
}
