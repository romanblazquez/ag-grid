import { ProcessCellForExportParams } from 'ag-grid-community';

export function formatAmountForExport(params: ProcessCellForExportParams): any {
  if (
    params.column
      .getId()
      .match(
        /^(tradeGrossAmount|totalNetProceedsAmount|totalNetProceedsAmountRoot|executionPricePerUnit)$/,
      )
  ) {
    return params.value &&
      typeof params.value === 'object' &&
      params.value !== null &&
      'amount' in params.value
      ? (params.value as { amount: unknown }).amount
      : params.value;
  }
  return params.value;
}

export function processDates(params: ProcessCellForExportParams): string {
  if (
    params.column.getId().match(/^(tradeDate|settlementDate|cancelTimeStamp)$/)
  ) {
    return new Date(params.value as Date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'UTC',
    });
  } else if (
    params.column
      .getId()
      .match(
        /^(tradeGrossAmount|totalNetProceedsAmount|totalNetProceedsAmountRoot|executionPricePerUnit)$/,
      )
  ) {
    return (params.value as any).amount as string;
  }
  return params.value as string;
}
