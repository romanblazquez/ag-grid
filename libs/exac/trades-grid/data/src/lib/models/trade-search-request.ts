export interface TradeSearchRequest {
  statuses?: string[];
  ivTypeCodes?: string[];
  parentTradingDeskShortNames?: string[];
  fmrIssueCusips: string[];
  startDate: string;
  endDate: string;
  fmrFundNumbers?: string[];
  traderPersonSourceIds?: string[];
  fmrSymbols?: string[];
  brokerFirmSourceIds?: number[];
}
