import { SuggestibleSearchSuggestion } from './suggestible-search-bar.model';

export const moduleName = 'Suggestible Search';

export const placeholderSuffix = 'Search';

/**
 * Possible search context domains.
 * Add additional enum members here as new search contexts are introduced.
 */
export enum SearchContext {
  Company = 'company',
  Fund = 'fund',
}

/**
 * Placeholder label shown inside the search input for each context.
 */
export const searchPlaceholder: Record<string, string> = {
  [SearchContext.Company]: 'Symbol',
  [SearchContext.Fund]: 'Fund',
};

/**
 * Column field keys used to render suggestion rows in the autocomplete panel.
 */
export const searchResultColumns: Record<string, Array<string>> = {
  [SearchContext.Company]: ['ticker', 'bloombergId2', 'bloombergId', 'longName'],
  [SearchContext.Fund]: ['shortName', 'fundNumber'],
};

/**
 * Tooltip labels for each result column (aligned by index with searchResultColumns).
 */
export const searchResultColumnsToolTip: Record<string, Array<string>> = {
  [SearchContext.Company]: [
    'FMR Ticker Symbol',
    'Bloomberg Primary Ticker',
    'Bloomberg Composite ID',
    'Security Name',
  ],
  [SearchContext.Fund]: ['Fund Short Name', 'Fund Number'],
};

/**
 * Column widths (in percent) for each result column in the autocomplete panel.
 */
export const searchResultColumnWidths: Record<string, Array<number>> = {
  [SearchContext.Company]: [20, 20, 20, 40],
  [SearchContext.Fund]: [50, 50],
};

/**
 * Derives the display value shown in the input field after the user selects a suggestion.
 * Each context maps to a function that extracts the relevant display field.
 */
export const displayFunction: Record<
  string,
  (suggestion: SuggestibleSearchSuggestion) => string
> = {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  [SearchContext.Company]: (suggestion) =>
    ((suggestion as Record<string, unknown>)?.['ticker'] as string) ?? '',
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  [SearchContext.Fund]: (suggestion) =>
    ((suggestion as Record<string, unknown>)?.['shortName'] as string) ?? '',
};

/**
 * Whether the clear button should be rendered for each search context.
 */
export const enableClearButton: Record<string, boolean> = {
  [SearchContext.Company]: true,
  [SearchContext.Fund]: true,
};
