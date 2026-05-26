import { TradeDetailUnderlier } from './trade-detail-underlier.interface';

export interface ExecutionModel {
  recordVersionNumber?: number;
  executionId: string;
  tradeDate: Date;
  settlementDate: Date | null;
  executionDate: Date | null;
  creationTimeStamp: Date | null;
  side: string | null;
  fmrTickerSymbol: string | null;
  executionCurrencyCode: string | null;
  asExecutedTraderInitials: string | null;
  executionTraderInitials: string;
  executingBroker: string;
  traderNote: string;
  executionGrossAmount: number;
  totalCommissionAmount: number;
  commissionRate: number | null;
  executionCommissionAmount: number | null;
  executionCommissionRate: number;
  researchCommissionAmount: number | null;
  researchCommissionRate: number | null;
  commissionTypeCode: string;
  totalFeeAmount: number;
  totalInterestBoughtSoldAmount: number;
  totalTaxAmount: number;
  totalNetProceedsAmount: number;
  executionPricePerUnit: number;
  executionQuantity: number;
  underlier: TradeDetailUnderlier;
  fmrMarketExchangeCode: string;
  isoMarketExchangeCode: string | null;
  cancelRebookExecutionId: string | null;
  cancelAdjustIndicator: string | null;
  cancelReasonCode: string | null;
  cancelTimeStamp: Date | null;
  cancelledByPersonIdSource: number | null;
  tradingDesk: string;
  tradingTeam: string;
  executionStatusCode: string;
  dealTypeCode: string | null;
  executionType: string;
  ivTypeCode: string;
  asTradedIvLongName: string;
  limitPriceAmount: string;
  interfundRationaleCode: string | null;
  interfundMessage: string | null;
  foreignExchangeRate: number | null;
  fmrIssueCusip: string;
  executingBrokerAmt: number | null;
  exchangeFee: number | null;
  blockId: string | null;
  blockPremium: number | null;
  rollRebate: number | null;
  giveUpFee: number | null;
  sector: string | null;
  clearingBroker: number | null;
  specificationValue: string | null;
  majorIndustry: string | null;
  minorIndustry: string | null;
  executionClearingBrokerRate: number;
  executingBrokerRate: number;
  systemCalculatedExchangeRate: number;
  executionExchangeFeeRate: number | null;
  executionBlockPremiumRate: number | null;
  totalNetProceedsAmountRoot: number | null;
  executionGrossRootCurrencyAmount: number | null;
  rollRebateRate: number | null;
  giveUpFeeRate: number | null;
  allocationMethodCode: string | null;
  allocationOverrideReasonCode: string | null;
  allocationOverrideReasonText: string | null;
  parentExecutionId: string | null;
  programCode: string | null;
  totalCommisionAmountRootCurrency: number;
  executionCommissionAmountRootCurrency: number;
  researchCommissionAmountRootCurrency: number;
  baseResearchRate: number;
}

export const mockExecutions: ExecutionModel[] = [
  {
    executionId: 'deeb38af-2404-35e6-a1d0-ce06449bc12c',
    tradeDate: new Date('2024-12-25'),
    settlementDate: new Date('2024-12-30'),
    executionDate: new Date('2025-01-23'),
    creationTimeStamp: new Date('2025-01-23T07:24:12.394Z'),
    side: 'SEL',
    fmrTickerSymbol: '*KENF',
    executionCurrencyCode: 'USD',
    asExecutedTraderInitials: 'INKD',
    executionTraderInitials: 'INKD',
    executingBroker: 'MSCO',
    traderNote: 'test',
    executionGrossAmount: 2.18,
    totalCommissionAmount: 0,
    commissionRate: null,
    executionCommissionAmount: null,
    executionCommissionRate: 0,
    researchCommissionAmount: null,
    researchCommissionRate: null,
    commissionTypeCode: '',
    totalFeeAmount: 0,
    totalInterestBoughtSoldAmount: 0,
    totalTaxAmount: 0,
    totalNetProceedsAmount: 2.18,
    executionPricePerUnit: 0.109,
    executionQuantity: 20,
    underlier: { fmrIssCusip: '00P99W229', longName: 'ELIFE HOLDINGS LTD', ticker: '*KENF' },
    fmrMarketExchangeCode: 'HK',
    isoMarketExchangeCode: 'XHKG',
    cancelRebookExecutionId: null,
    cancelAdjustIndicator: null,
    cancelReasonCode: null,
    cancelTimeStamp: null,
    cancelledByPersonIdSource: null,
    tradingDesk: 'FMRRIK',
    tradingTeam: '',
    executionStatusCode: 'EA',
    dealTypeCode: null,
    executionType: '',
    ivTypeCode: 'CS',
    asTradedIvLongName: 'ELIFE HOLDINGS LTD',
    limitPriceAmount: '',
    interfundRationaleCode: null,
    interfundMessage: null,
    foreignExchangeRate: 1.0,
    fmrIssueCusip: '00P99W229',
    executingBrokerAmt: null,
    exchangeFee: null,
    blockId: null,
    blockPremium: null,
    rollRebate: null,
    giveUpFee: null,
    sector: 'Industrials',
    clearingBroker: null,
    specificationValue: null,
    majorIndustry: 'Trading Companies & Distributors',
    minorIndustry: 'Trading Companies & Distributors',
    executionClearingBrokerRate: 0,
    executingBrokerRate: 0,
    systemCalculatedExchangeRate: 0,
    executionExchangeFeeRate: null,
    executionBlockPremiumRate: null,
    totalNetProceedsAmountRoot: 2.18,
    executionGrossRootCurrencyAmount: 2.18,
    rollRebateRate: null,
    giveUpFeeRate: null,
    allocationMethodCode: null,
    allocationOverrideReasonCode: null,
    allocationOverrideReasonText: null,
    parentExecutionId: null,
    programCode: null,
    totalCommisionAmountRootCurrency: 0,
    executionCommissionAmountRootCurrency: 0,
    researchCommissionAmountRootCurrency: 0,
    baseResearchRate: 0,
  },
];
