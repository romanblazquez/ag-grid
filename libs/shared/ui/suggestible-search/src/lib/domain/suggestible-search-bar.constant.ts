/*
 * Copyright (c) 2023 FMR Corp.
 * All Rights Reserved.
 *
 * Fidelity Confidential Information.
 * Created on 10/12/23, 1:50 PM
 */

import { SuggestibleSearchService } from '@fmr-pr000539/shared/data-access/suggestible-search';
import {
  PorfolioSuggestion,
  SecuritySuggestion,
} from '@fmr-pr000539/shared/data';
import { SuggestibleSearchSuggestion } from './suggestible-search-bar.model';

export const moduleName = 'Suggestible Search';

export const placeholderSuffix = 'Search';

/**
 * Defines the list of place holder texts to show in the search bar
 */
export const searchPlaceholder: Record<string, string> = {
  company: `Symbol`,
  fund: `Fund`,
};

/**
 * Defines the list of Search Suggestion fields to show as columns in the drop down
 */
export const searchResultColumns: Record<string, Array<string>> = {
  company: ['ticker', 'bloombergId2', 'bloombergId', 'longName'],
  fund: ['shortName', 'fundNumber'],
};

/**
 * Defines the list of Search Suggestion fields to show as columns in the drop down
 */
export const searchResultColumnsToolTip: Record<string, Array<string>> = {
  company: [
    'FMR Ticker Symbol',
    'Bloomberg Primary Ticker',
    'Bloomberg Composite ID',
    'Security Name',
  ],
  fund: ['FMR Fund Short Name', 'FMR Fund Number'],
};

/**
 * Defines the widths in percentages for each column in the dropdown
 */
export const searchResultColumnWidths: Record<string, Array<number>> = {
  company: [20, 20, 20, 40],
  fund: [50, 50],
};

/**
 * Defines the field to show in the input box upon selecting an option
 */
export const displayFunction: Record<
  string,
  (suggestion: SuggestibleSearchSuggestion) => string
> = {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  company: (suggestion) => (suggestion as SecuritySuggestion)?.ticker,
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  fund: (suggestion) => (suggestion as PorfolioSuggestion)?.shortName,
};

/**
 * Defines the api method name to be invoked for a given search context
 */
export const suggestibleSearchEndpoint: Record<
  string,
  keyof SuggestibleSearchService
> = {
  company: 'getSecurity',
  fund: 'getPortfolio',
};

/**
 * Defines the possible domains of Suggestible Search capabilities
 */
export enum SearchContext {
  Company = 'company',
  Fund = 'fund',
}

export const enableClearButton: Record<string, boolean> = {
  company: true,
  fund: true,
};
