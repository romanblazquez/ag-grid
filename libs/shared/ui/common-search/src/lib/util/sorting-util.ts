export function bestMatchSortFn<T>(
  query: string,
  getString: (item: T) => string,
): (a: T, b: T) => number {
  const q = query.toLowerCase();
  return (a: T, b: T): number => {
    const aStr = getString(a).toLowerCase();
    const bStr = getString(b).toLowerCase();

    const aStarts = aStr.startsWith(q) ? 0 : 1;
    const bStarts = bStr.startsWith(q) ? 0 : 1;

    if (aStarts !== bStarts) {
      return aStarts - bStarts;
    }

    return aStr.localeCompare(bStr);
  };
}
