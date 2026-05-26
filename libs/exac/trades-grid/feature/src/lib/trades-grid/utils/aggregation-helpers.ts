/**
 * Aggregates unique non-empty values from an array of strings.
 * Handles comma-separated values by splitting them into individual items.
 * @param values - Array of string values to aggregate (may contain comma-separated values)
 * @param options - Optional configuration for formatting
 * @returns Comma-separated string of unique sorted values
 */
export function aggregateUniqueValues(
  values: string[],
  options?: {
    excludeEmpty?: boolean;
    excludeNull?: boolean;
    sort?: boolean;
    separator?: string;
  },
): string {
  const {
    excludeEmpty = true,
    sort = true,
    separator = ', ',
  } = options || {};

  const uniqueValues = new Set<string>();

  values.forEach((value: string) => {
    if (value == null) {
      return;
    }

    if (value.includes(',')) {
      value.split(',').forEach((v) => {
        const trimmed = v.trim();
        if (!excludeEmpty || trimmed !== '') {
          uniqueValues.add(trimmed);
        }
      });
    } else {
      const trimmed = value.trim();
      if (!excludeEmpty || trimmed !== '') {
        uniqueValues.add(trimmed);
      }
    }
  });

  const result = Array.from(uniqueValues);
  if (sort) result.sort();
  return result.join(separator);
}
