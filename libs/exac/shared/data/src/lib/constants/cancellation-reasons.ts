export interface CancellationReason {
  code: string;
  description: string;
  displayText: string;
}

export const CANCELLATION_REASONS: CancellationReason[] = [
  { code: 'RBK', description: 'Rebooking', displayText: 'RBK - Rebooking' },
  { code: 'COM', description: 'Commission', displayText: 'COM - Commission' },
  { code: 'CAN', description: 'Cancelled', displayText: 'CAN - Cancelled' },
  { code: 'ERR', description: 'Error', displayText: 'ERR - Error' },
  { code: 'OTR', description: 'Other', displayText: 'OTR - Other' },
];

export const BATCH_ADJUSTMENT_REASONS: CancellationReason[] = [
  { code: 'BKR', description: 'Broker', displayText: 'BKR - Broker' },
  { code: 'COM', description: 'Commission', displayText: 'COM - Commission' },
  { code: 'MKT', description: 'Market Exchange', displayText: 'MKT - Market Exch' },
  { code: 'STL', description: 'Settlement Date', displayText: 'STL - Settlement Date' },
  { code: 'TDR', description: 'Trader', displayText: 'TDR - Trader' },
  { code: 'TRD', description: 'Trade Date', displayText: 'TRD - Trade Date' },
  { code: 'OTR', description: 'Other', displayText: 'OTR - Other' },
];

export const SINGLE_ADJUSTMENT_REASONS: CancellationReason[] = [
  { code: 'BKR', description: 'Broker', displayText: 'BKR - Broker' },
  { code: 'COM', description: 'Commission', displayText: 'COM - Commission' },
  { code: 'XCG', description: 'Exchange Rate', displayText: 'XCG - Exchange Rate' },
  { code: 'FCT', description: 'Factor', displayText: 'FCT - Factor' },
  { code: 'FEE', description: 'Fees', displayText: 'FEE - Fees' },
  { code: 'INT', description: 'Interest', displayText: 'INT - Interest' },
  { code: 'MKT', description: 'Market Exchange', displayText: 'MKT - Market Exch' },
  { code: 'OTR', description: 'Other', displayText: 'OTR - Other' },
  { code: 'PR', description: 'Price', displayText: 'PR - Price' },
  { code: 'SHR', description: 'Execution Shares', displayText: 'SHR - Exec Shares' },
  { code: 'STL', description: 'Settlement Date', displayText: 'STL - Settlement Date' },
  { code: 'TAX', description: 'Taxes', displayText: 'TAX - Taxes' },
  { code: 'TDR', description: 'Trader', displayText: 'TDR - Trader' },
  { code: 'TRD', description: 'Trade Date', displayText: 'TRD - Trade Date' },
];
