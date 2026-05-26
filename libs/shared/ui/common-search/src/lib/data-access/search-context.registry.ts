import { Context } from '../model/search-context.model';
import { SearchType } from '../model/search-type.enum';

/**
 * Static registry of search contexts keyed by string.
 * Pre-populated with the original trade-domain types for backward compat.
 *
 * New consumers can either:
 * 1. Add entries here at build time (if the type is shared across features)
 * 2. Call `DataAccessFacadeService.registerContext()` at runtime
 * 3. Skip the registry entirely by passing `dataSourceFn` on `SearchContext`
 */
export const SEARCH_CONTEXT_REGISTRY: Record<string, Context> = {
  [SearchType.Symbol]: {
    searchType: SearchType.Symbol,
    placeholder: 'Symbol / CUSIP',
    emitField: 'cusip',
    initLoadData: true,
    detailFields: [
      { name: 'symbol', visible: true },
      { name: 'cusip', visible: true },
      { name: 'description', visible: true },
    ],
    detailHeaders: ['Symbol', 'CUSIP', 'Description'],
    fieldWidths: { symbol: 22, cusip: 22, description: 56 },
    panelWidth: 540,
    isTreeView: false,
    multiselect: true,
    errorMessage: 'No matching symbols found',
  },
  [SearchType.FundPm]: {
    searchType: SearchType.FundPm,
    placeholder: 'Fund',
    emitField: 'fundNumber',
    initLoadData: true,
    detailFields: [
      { name: 'shortName', visible: true },
      { name: 'fundNumber', visible: true },
      { name: 'fullName', visible: true },
    ],
    detailHeaders: ['Short Name', 'Fund #', 'Full Name'],
    fieldWidths: { shortName: 24, fundNumber: 16, fullName: 60 },
    panelWidth: 520,
    isTreeView: false,
    multiselect: true,
    errorMessage: 'No matching funds found',
  },
  [SearchType.Broker]: {
    searchType: SearchType.Broker,
    placeholder: 'Broker',
    emitField: 'firmSourceId',
    chipDisplayField: 'firmCode',
    initLoadData: true,
    detailFields: [
      { name: 'firmName', visible: true },
      { name: 'firmCode', visible: true },
    ],
    detailHeaders: ['Firm Name', 'Code'],
    fieldWidths: { firmName: 70, firmCode: 30 },
    panelWidth: 460,
    isTreeView: false,
    multiselect: true,
    errorMessage: 'No matching brokers found',
  },
  [SearchType.Trader]: {
    searchType: SearchType.Trader,
    placeholder: 'Trader',
    emitField: 'personSourceId',
    chipDisplayField: 'desk',
    initLoadData: true,
    detailFields: [
      { name: 'fullName', visible: true },
      { name: 'desk', visible: true },
    ],
    detailHeaders: ['Trader', 'Desk'],
    fieldWidths: { fullName: 60, desk: 40 },
    panelWidth: 440,
    isTreeView: false,
    multiselect: true,
    errorMessage: 'No matching traders found',
  },
  [SearchType.InstrumentType]: {
    searchType: SearchType.InstrumentType,
    placeholder: 'Instrument Type',
    emitField: 'code',
    chipDisplayField: 'code',
    initLoadData: true,
    detailFields: [
      { name: 'description', visible: true },
      { name: 'code', visible: true },
    ],
    detailHeaders: ['Description', 'Code'],
    fieldWidths: { description: 70, code: 30 },
    panelWidth: 460,
    isTreeView: true,
    multiselect: true,
    errorMessage: 'No matching instrument types found',
  },
};
