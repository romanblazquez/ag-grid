import { Context } from '../model/search-context.model';
import { SearchType } from '../model/search-type.enum';

/**
 * UI-only overrides that the legacy Context model doesn't provide.
 * All data-related fields (detailFields, emitField, apiNames, etc.)
 * come from the legacy externalServices constant.
 */
export const SEARCH_CONTEXT_REGISTRY: Record<string, Partial<Context>> = {
  [SearchType.Symbol]: { chipDisplayField: 'ticker' },
  [SearchType.FundPm]: { chipDisplayField: 'code' },
  [SearchType.Broker]: { chipDisplayField: 'shortName' },
  [SearchType.Trader]: { chipDisplayField: 'initials' },
  [SearchType.InstrumentType]: { chipDisplayField: 'code' },
};
