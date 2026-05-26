import { TradeSearchRequest } from './trade-search-request';

export type ExecutionSearchRequest = Omit<TradeSearchRequest, 'fmrFundNumbers'>;
