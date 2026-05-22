export enum DateSelectionType {
  Custom = 'custom',
  Today = 'today',
  Yesterday = 'yesterday',
  Last7Days = 'last7Days',
  Last30Days = 'last30Days',
  ThisMonth = 'thisMonth',
  LastMonth = 'lastMonth',
  YearToDate = 'yearToDate',
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface DateRangeEvent {
  dateRange: DateRange;
  dateSelectionType: DateSelectionType;
}

export interface DateSelectionOption {
  label: string;
  type: DateSelectionType;
}

export const DATE_SELECTION_OPTIONS: DateSelectionOption[] = [
  { label: 'Custom', type: DateSelectionType.Custom },
  { label: 'Today', type: DateSelectionType.Today },
  { label: 'Yesterday', type: DateSelectionType.Yesterday },
  { label: 'Last 7 Days', type: DateSelectionType.Last7Days },
  { label: 'Last 30 Days', type: DateSelectionType.Last30Days },
  { label: 'This Month', type: DateSelectionType.ThisMonth },
  { label: 'Last Month', type: DateSelectionType.LastMonth },
  { label: 'Year to Date', type: DateSelectionType.YearToDate },
];
