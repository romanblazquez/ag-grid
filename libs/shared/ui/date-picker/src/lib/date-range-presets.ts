import { DateRange, DateSelectionType } from './date-range.model';

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function computePresetRange(
  type: DateSelectionType,
  now: Date = new Date(),
): DateRange | null {
  const today = startOfDay(now);
  switch (type) {
    case DateSelectionType.Today:
      return { startDate: today, endDate: endOfDay(today) };
    case DateSelectionType.Yesterday: {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return { startDate: y, endDate: endOfDay(y) };
    }
    case DateSelectionType.Last7Days: {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      return { startDate: start, endDate: endOfDay(today) };
    }
    case DateSelectionType.Last30Days: {
      const start = new Date(today);
      start.setDate(start.getDate() - 29);
      return { startDate: start, endDate: endOfDay(today) };
    }
    case DateSelectionType.ThisMonth: {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { startDate: start, endDate: endOfDay(today) };
    }
    case DateSelectionType.LastMonth: {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { startDate: start, endDate: endOfDay(end) };
    }
    case DateSelectionType.YearToDate: {
      const start = new Date(today.getFullYear(), 0, 1);
      return { startDate: start, endDate: endOfDay(today) };
    }
    default:
      return null;
  }
}
