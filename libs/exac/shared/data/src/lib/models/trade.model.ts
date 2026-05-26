export interface TradeModel {
  recordVersionNumber?: number;
  entityId: string;
  tradeDate: Date;
  settlementDate: Date;
  creationTimestamp: Date;
  side: string;
  enteredFundShortName: string;
  fmrTickerSymbol: string;
  execId: string | null;
  executionCurrencyCode: string;
  executionTraderInitials: string;
  executingBroker: string;
  traderNote: string;
  tradeGrossAmount: number;
  totalCommissionAmount: number;
  commissionRate: number;
  commissionTypeCode: string;
  totalFeeAmount: number;
  totalInterestBoughtSoldAmount: number;
  totalTaxAmount: number;
  totalNetProceedsAmount: number;
  executionPricePerUnit: number;
  executionQuantity: number;
  tradeGrossAmountRootCurrency: number;
  totalNetProceedsAmountRoot: number;
  asTradedIvLongName: string;
  fmrMarketExchangeCode: string;
  cancelAdjustIndicator: string;
  cancelTimeStamp: Date;
  cancelReasonCode: string;
  cancelledByPersonIdSource: number;
  tradingDesk: string;
  tradingTeamShortName: string;
  tradeStatus: string;
  executionCommissionRate: number;
  executionCommissionAmount: number;
  researchCommissionRate: number;
}

export const mockTrades: TradeModel[] = [
  {
    entityId: '34e91f2b-236f-3fac-950d-5643dd54c1',
    tradeDate: new Date(),
    settlementDate: new Date(),
    creationTimestamp: new Date(),
    side: 'Buy',
    enteredFundShortName: 'BIO',
    execId: '28e91f2b-236f-3fac-950d-5643dd54a0',
    fmrTickerSymbol: '*BP',
    executionCurrencyCode: 'GBP',
    executionTraderInitials: 'AB',
    executingBroker: 'DUM10',
    traderNote: 'Note',
    tradeGrossAmount: 57600,
    totalCommissionAmount: 34.56,
    commissionRate: 6,
    commissionTypeCode: 'B',
    totalFeeAmount: 1,
    totalInterestBoughtSoldAmount: 120,
    totalTaxAmount: 288,
    totalNetProceedsAmount: 57923.56,
    executionPricePerUnit: 48.254125,
    executionQuantity: 1200,
    tradeGrossAmountRootCurrency: 78258.24,
    totalNetProceedsAmountRoot: 78697.84,
    asTradedIvLongName: 'BP PLC',
    fmrMarketExchangeCode: 'UK',
    cancelAdjustIndicator: 'Y',
    cancelTimeStamp: new Date(),
    cancelReasonCode: 'ALC',
    cancelledByPersonIdSource: 99900028,
    tradingDesk: 'FMRHK',
    tradingTeamShortName: 'CNSM',
    tradeStatus: 'XA',
    executionCommissionRate: 0.4,
    executionCommissionAmount: 0.2,
    researchCommissionRate: 0.3,
  },
];
