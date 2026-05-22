export interface TradeSearchRequest {
  fmrIssueCusips: string[];
  startDate: string;
  endDate: string;
  parentTradingDeskShortNames?: string[];
  ivTypeCodes?: string[];
  statuses?: string[];
  fmrFundNumbers?: string[];
  brokerFirmSourceIds?: number[];
  fmrSymbols?: string[];
  traderPersonSourceIds?: string[];
}

export type ExecutionSearchRequest = Omit<TradeSearchRequest, 'fmrFundNumbers'>;

export enum GridView {
  Trades = 'trades',
  Executions = 'executions',
}

export const gridViewQParams = 'view';
