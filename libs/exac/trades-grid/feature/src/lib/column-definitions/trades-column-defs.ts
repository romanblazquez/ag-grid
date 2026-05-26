import {
  ColDef,
  ICellRendererParams,
  ValueFormatterParams,
} from 'ag-grid-community';
import { getDateTimeGetter, numberFormatter, PersonCacheService } from '@trade-platform/shared/data-access';
import { RowGroupTooltipComponent } from '../trades-grid/row-group-tooltip/row-group-tooltip.component';
import { getCancelReasonDisplayText } from '@trade-platform/exac/shared/data';
import { createTradesTraderColumnDef } from './trades';
import { AG_SET_COLUMN_FILTER, AGGREGATE_UNIQUE_VALUES } from './constants';

/* eslint-disable */
export function getTradesColumnDef(personCacheService: PersonCacheService): ColDef[] {
  return [
    {
      headerName: 'Trade ID',
      colId: 'entityId',
      field: 'entityId',
      minWidth: 80,
      filter: 'agSetColumnFilter',
    },
    {
      headerName: 'Trade Date',
      field: 'tradeDate',
      colId: 'tradeDate',
      filter: 'agDateColumnFilter',
      minWidth: 100,
      sort: 'asc',
    },
    {
      headerName: 'Settle Date',
      field: 'settlementDate',
      colId: 'settlementDate',
      filter: 'agDateColumnFilter',
      minWidth: 100,
    },
    {
      headerName: 'Execution Date/Time',
      field: 'creationTimestamp',
      colId: 'creationTimestamp',
      minWidth: 100,
      filter: 'agDateColumnFilter',
      valueFormatter: (params) => {
        if (params.data !== undefined) {
          return getDateTimeGetter(params.data.creationTimestamp);
        } else {
          return '';
        }
      },
    },
    {
      headerName: 'Side',
      field: 'side',
      colId: 'side',
      minWidth: 80,
      filter: 'agSetColumnFilter',
    },
    {
      headerName: 'Fund',
      field: 'enteredFundShortName',
      colId: 'enteredFundShortName',
      minWidth: 80,
      filter: 'agSetColumnFilter',
    },
    {
      headerName: 'Symbol',
      field: 'fmrTickerSymbol',
      colId: 'fmrTickerSymbol',
      minWidth: 80,
      filter: 'agSetColumnFilter',
    },
    {
      headerName: 'Currency',
      field: 'executionCurrencyCode',
      colId: 'executionCurrencyCode',
      minWidth: 80,
      filter: 'agSetColumnFilter',
    },
    createTradesTraderColumnDef(personCacheService, 'executionTraderInitials'),
    {
      headerName: 'Broker',
      field: 'executingBroker',
      colId: 'executingBroker',
      minWidth: 80,
      filter: 'agSetColumnFilter',
      aggFunc: 'brokers',
      cellRenderer: RowGroupTooltipComponent,
    },
    {
      headerName: 'Trader Note',
      field: 'traderNote',
      colId: 'traderNote',
      minWidth: 100,
      filter: 'agSetColumnFilter',
    },
    {
      headerName: 'Gross Amount',
      field: 'tradeGrossAmount',
      colId: 'tradeGrossAmount',
      minWidth: 120,
      filter: 'agNumberColumnFilter',
      valueGetter: (params) => {
        if (params.node != null && !params.node.group) {
          return {
            currency: params.data.executionCurrencyCode as string,
            side: params.data.side as string,
            amount: params.data.tradeGrossAmount as number,
          };
        } else return '';
      },
      valueFormatter: (params: ValueFormatterParams) =>
        numberFormatter(
          { value: params.value?.amount as number } as ICellRendererParams,
          2,
        ),
      aggFunc: 'tradeSum',
      keyCreator: (params) => params.value?.amount as string,
      filterValueGetter: (params) => params.data.tradeGrossAmount as number,
      tooltipValueGetter: (params) =>
        'Aggregation shows the sum of buys plus sells in local currency. If the currency of the trade is different, no aggregation is displayed.',
    },
    {
      headerName: 'Commission',
      field: 'totalCommissionAmount',
      colId: 'totalCommissionAmount',
      minWidth: 100,
      filter: 'agNumberColumnFilter',
      cellRenderer: (params: ICellRendererParams) => numberFormatter(params, 2),
    },
    {
      headerName: 'Commission Rate',
      colId: 'commissionRate',
      field: 'commissionRate',
      minWidth: 140,
      filter: 'agNumberColumnFilter',
    },
    {
      headerName: 'Commission Type',
      field: 'commissionTypeCode',
      colId: 'commissionTypeCode',
      minWidth: 140,
      filter: 'agSetColumnFilter',
    },
    {
      headerName: 'Execution Commission Rate',
      colId: 'executionCommissionRate',
      field: 'executionCommissionRate',
      minWidth: 140,
      filter: 'agNumberColumnFilter',
    },
    {
      headerName: 'Execution Commission Amount',
      colId: 'executionCommissionAmount',
      field: 'executionCommissionAmount',
      minWidth: 140,
      filter: 'agNumberColumnFilter',
    },
    {
      headerName: 'Research Commission Rate',
      colId: 'researchCommissionRate',
      field: 'researchCommissionRate',
      minWidth: 140,
      filter: 'agNumberColumnFilter',
    },
    {
      headerName: 'Research Commission Amount',
      colId: 'researchCommissionAmount',
      field: 'researchCommissionAmount',
      minWidth: 140,
      filter: 'agNumberColumnFilter',
    },
    {
      headerName: 'Fees',
      field: 'totalFeeAmount',
      colId: 'totalFeeAmount',
      minWidth: 80,
      filter: 'agNumberColumnFilter',
      cellRenderer: (params: ICellRendererParams) => numberFormatter(params, 2),
    },
    {
      headerName: 'Interest',
      field: 'totalInterestBoughtSoldAmount',
      colId: 'totalInterestBoughtSoldAmount',
      minWidth: 80,
      filter: 'agNumberColumnFilter',
      cellRenderer: (params: ICellRendererParams) => numberFormatter(params, 2),
    },
    {
      headerName: 'Taxes',
      field: 'totalTaxAmount',
      colId: 'totalTaxAmount',
      minWidth: 80,
      filter: 'agNumberColumnFilter',
      cellRenderer: (params: ICellRendererParams) => numberFormatter(params, 2),
    },
    {
      headerName: 'Net Amount',
      field: 'totalNetProceedsAmount',
      colId: 'totalNetProceedsAmount',
      minWidth: 80,
      filter: 'agNumberColumnFilter',
      valueGetter: (params) => {
        if (params.node != null && !params.node.group) {
          return {
            currency: params.data.executionCurrencyCode as string,
            side: params.data.side as string,
            amount: params.data.totalNetProceedsAmount as number,
          };
        } else return ['Buy', 0];
      },
      aggFunc: 'tradeNet',
      cellRenderer: (params: ICellRendererParams) =>
        numberFormatter(
          { value: params.value?.amount as number } as ICellRendererParams,
          2,
        ),
      keyCreator: (params) => params.value?.amount as string,
      filterValueGetter: (params) => params.data.totalNetProceedsAmount as number,
      tooltipValueGetter: (params) =>
        'Aggregation shows the difference for buys minus sells in local currency. If the currency of the trade is different, no aggregation is displayed.',
    },
    {
      headerName: 'Executed Price',
      field: 'executionPricePerUnit',
      colId: 'executionPricePerUnit',
      minWidth: 80,
      filter: 'agNumberColumnFilter',
      aggFunc: 'avgExecutedPrice',
      valueGetter: (params) => {
        if (!params.data) return null;
        return {
          currency: params.data.executionCurrencyCode as string,
          amount: params.data.executionPricePerUnit as number,
          executionQuantity: params.data.executionQuantity as number,
        };
      },
      cellRenderer: (params: ICellRendererParams) =>
        numberFormatter(
          { value: params.value?.amount as number } as ICellRendererParams,
          6,
        ),
      keyCreator: (params) => params.value?.amount as string,
      filterValueGetter: (params) => params.data.executionQuantity as number,
      tooltipValueGetter: (params) =>
        'Aggregation shows the average price of the trades prorated by executed quantity. If the currency of the trade is different, no aggregation is displayed.',
    },
    {
      headerName: 'Executed Quantity',
      field: 'executionQuantity',
      colId: 'executionQuantity',
      minWidth: 80,
      filter: 'agNumberColumnFilter',
      aggFunc: 'sum',
      cellRenderer: (params: ICellRendererParams) => numberFormatter(params, 2),
      tooltipValueGetter: (params) => 'Aggregation shows the sum of executed quantity',
    },
    {
      headerName: 'Gross Amount USD',
      field: 'tradeGrossAmountRootCurrency',
      colId: 'tradeGrossAmountRootCurrency',
      minWidth: 140,
      filter: 'agNumberColumnFilter',
      aggFunc: 'sum',
      cellRenderer: (params: ICellRendererParams) => numberFormatter(params, 2),
      tooltipValueGetter: (params) =>
        'Aggregation shows the sum of buys plus sells in USD. If the currency of the trade is different, USD is still aggregated.',
    },
    {
      headerName: 'Net Amount USD',
      field: 'totalNetProceedsAmountRoot',
      colId: 'totalNetProceedsAmountRoot',
      minWidth: 140,
      filter: 'agNumberColumnFilter',
      valueGetter: (params) => {
        if (params.node != null && !params.node.group) {
          return {
            side: params.data.side as string,
            amount: params.data.totalNetProceedsAmountRoot as number,
          };
        } else return [];
      },
      aggFunc: 'tradeNetUSD',
      cellRenderer: (params: ICellRendererParams) =>
        numberFormatter(
          { value: params.value?.amount as number } as ICellRendererParams,
          2,
        ),
      keyCreator: (params) => params.value?.amount as string,
      filterValueGetter: (params) => params.data.totalNetProceedsAmountRoot as number,
      tooltipValueGetter: (params) =>
        'Aggregation shows the difference of buys minus sells in USD. If the currency of the trade is different, USD is still aggregated.',
    },
    {
      headerName: 'Security Name',
      field: 'asTradedIvLongName',
      colId: 'asTradedIvLongName',
      minWidth: 120,
      filter: 'agSetColumnFilter',
    },
    {
      headerName: 'Market/Exchange Code',
      field: 'fmrMarketExchangeCode',
      colId: 'fmrMarketExchangeCode',
      minWidth: 120,
      filter: 'agSetColumnFilter',
    },
    {
      headerName: 'Cancel/Rebook Indicator',
      field: 'cancelAdjustIndicator',
      colId: 'cancelAdjustIndicator',
      minWidth: 120,
      filter: 'agSetColumnFilter',
    },
    {
      headerName: 'Cancel Date/Time',
      field: 'cancelTimeStamp',
      colId: 'cancelTimeStamp',
      minWidth: 100,
      filter: 'agDateColumnFilter',
      valueFormatter: (params) => {
        if (params.data !== undefined) {
          return getDateTimeGetter(params.data.cancelTimeStamp);
        } else {
          return '';
        }
      },
    },
    {
      headerName: 'Cancel Reason',
      field: 'cancelReasonCode',
      colId: 'cancelReasonCode',
      minWidth: 120,
      filter: AG_SET_COLUMN_FILTER,
      aggFunc: AGGREGATE_UNIQUE_VALUES,
      cellRenderer: (params: ICellRendererParams) => params.value,
      valueFormatter: (params) => getCancelReasonDisplayText(params.value),
      tooltipValueGetter: (params) => getCancelReasonDisplayText(params.value),
    },
    {
      headerName: 'Cancelled By',
      field: 'cancelledByPersonIdSource',
      colId: 'cancelledByPersonIdSource',
      minWidth: 120,
      filter: AG_SET_COLUMN_FILTER,
      aggFunc: AGGREGATE_UNIQUE_VALUES,
      cellRenderer: (params: ICellRendererParams) => {
        if (params.node.group) {
          const aggregatedValue = (params.node.aggData as any)?.cancelledByPersonIdSource;
          if (!aggregatedValue) return '';
          return aggregatedValue
            .split(', ')
            .map((id: string) => personCacheService.getPersonInitials(id))
            .join(', ');
        }
        if (!params.value) return '';
        return personCacheService.getPersonInitials(params.value);
      },
      filterParams: {
        valueFormatter: (params: ValueFormatterParams) =>
          params?.value ? personCacheService.getPersonInitials(params.value) : '',
      },
      tooltipValueGetter: (params) => {
        if (params?.node?.group) {
          const aggregatedValue = (params.node.aggData as any)?.cancelledByPersonIdSource;
          if (!aggregatedValue) return '';
          return aggregatedValue
            .split(', ')
            .map((value: string) => personCacheService.getFullNameFromInitial(value))
            .join(', ');
        }
        const cancelledByPersonIdSource = params.data?.cancelledByPersonIdSource;
        if (!cancelledByPersonIdSource) return '';
        return personCacheService.getPersonFullName(cancelledByPersonIdSource);
      },
      valueFormatter: (params) =>
        params?.value ? personCacheService.getPersonInitials(params.value) : '',
      filterValueGetter: (params) => {
        if (params?.node?.group) {
          return (params.node.aggData as any)?.cancelledByPersonIdSource ?? '';
        }
        const cancelledByPersonIdSource = params.data?.cancelledByPersonIdSource;
        if (!cancelledByPersonIdSource) return '';
        return personCacheService.getPersonInitialsFiltering(cancelledByPersonIdSource);
      },
      valueGetter: (params) => {
        if (params.node?.group) {
          return (params.node.aggData as any)?.cancelledByPersonIdSource ?? '';
        }
        const cancelledByPersonIdSource = params.data?.cancelledByPersonIdSource;
        if (!cancelledByPersonIdSource) return '';
        return personCacheService.getPersonInitials(cancelledByPersonIdSource);
      },
      keyCreator: (params) => params.value,
    },
    {
      headerName: 'Trading Desk',
      field: 'tradingDesk',
      colId: 'tradingDesk',
      minWidth: 120,
      filter: 'agSetColumnFilter',
    },
    {
      headerName: 'Trading Team',
      field: 'tradingTeamShortName',
      colId: 'tradingTeamShortName',
      minWidth: 120,
      filter: 'agSetColumnFilter',
    },
    {
      headerName: 'Status Code',
      field: 'tradeStatus',
      colId: 'tradeStatus',
      minWidth: 120,
      filter: 'agSetColumnFilter',
    },
    {
      headerName: 'Underlying Symbol',
      field: 'underlyingSymbol',
      colId: 'underlyingSymbol',
      minWidth: 120,
      filter: 'agSetColumnFilter',
    },
    {
      headerName: 'Trade Type',
      field: 'trdTypCD',
      colId: 'trdTypCD',
      minWidth: 120,
      filter: 'agSetColumnFilter',
    },
    {
      headerName: 'Execution ID',
      field: 'execId',
      colId: 'execId',
      minWidth: 120,
      filter: 'agSetColumnFilter',
    },
    {
      headerName: 'Instrument Type Code',
      field: 'ivTypCD',
      colId: 'ivTypCD',
      minWidth: 120,
      filter: 'agSetColumnFilter',
    },
    {
      headerName: 'FMRID',
      field: 'fmrIssueCusip',
      colId: 'fmrIssueCusip',
      minWidth: 120,
      filter: 'agSetColumnFilter',
    },
  ];
}
