/* eslint-disable */
// SonarQube: Duplication is acceptable for configuration data files

import { GridState } from 'ag-grid-community';
import { SharedDefaultView } from './default-views.types';

/**
 * Shared views that can be used by multiple apps
 */
export const sharedDefaultViews: SharedDefaultView[] = [
  {
    viewName: 'Symbol Summary',
    description: 'Pivot view grouped by Symbol with aggregated amounts',
    availableFor: ['EQTEXECUTIONSACTIVITYUI:TRADES'],
    gridState: {
      sideBar: {
        visible: true,
        position: 'right',
        openToolPanel: null,
        toolPanels: {
          columns: { expandedGroupIds: [] },
          filters: { expandedGroupIds: [], expandedColIds: [] },
        },
      },
      expandAll: false,
      rowGroup: {
        groupColIds: ['fmrTickerSymbol'],
      },
      aggregation: {
        aggregationModel: [
          { colId: 'executingBroker', aggFunc: 'brokers' },
          { colId: 'executionQuantity', aggFunc: 'sum' },
          { colId: 'executionPricePerUnit', aggFunc: 'avgExecutedPrice' },
          { colId: 'tradeGrossAmount', aggFunc: 'tradeSum' },
          { colId: 'tradeGrossAmountRootCurrency', aggFunc: 'sum' },
          { colId: 'totalNetProceedsAmount', aggFunc: 'tradeNet' },
          { colId: 'totalNetProceedsAmountRoot', aggFunc: 'tradeNetUSD' },
        ],
      },
      pivot: {
        pivotMode: true,
        pivotColIds: [],
      },
      columnPinning: {
        leftColIds: ['ag-Grid-AutoColumn-fmrTickerSymbol'],
        rightColIds: [],
      },
      columnVisibility: {
        hiddenColIds: ['checkbox', 'fmrTickerSymbol'],
      },
      sort: { sortModel: [] },
      filter: { filterModel: {} },
      pagination: { page: 0 },
      columnGroup: { openColumnGroupIds: [] },
      rowGroupExpansion: { expandedRowGroupIds: [] },
      rangeSelection: { cellRanges: [] },
      scroll: { top: 0, left: 0 },
      rowSelection: [],
    } as GridState,
  },
  {
    viewName: 'Symbol Summary',
    description: 'Pivot view grouped by Symbol with aggregated amounts',
    availableFor: ['EQTEXECUTIONSACTIVITYUI:EXECUTIONS'],
    gridState: {
      sideBar: {
        visible: true,
        position: 'right',
        openToolPanel: null,
        toolPanels: {
          columns: { expandedGroupIds: [] },
          filters: { expandedGroupIds: [], expandedColIds: [] },
        },
      },
      expandAll: false,
      rowGroup: {
        groupColIds: ['fmrTickerSymbol'],
      },
      aggregation: {
        aggregationModel: [
          { colId: 'executingBroker', aggFunc: 'brokers' },
          { colId: 'executionQuantity', aggFunc: 'sum' },
          { colId: 'executionPricePerUnit', aggFunc: 'avgExecutedPrice' },
          { colId: 'executionGrossAmount', aggFunc: 'tradeSum' },
          { colId: 'executionGrossRootCurrencyAmount', aggFunc: 'sum' },
          { colId: 'totalNetProceedsAmount', aggFunc: 'tradeNet' },
          { colId: 'totalNetProceedsAmountRoot', aggFunc: 'tradeNetUSD' },
        ],
      },
      pivot: {
        pivotMode: true,
        pivotColIds: [],
      },
      columnPinning: {
        leftColIds: ['ag-Grid-AutoColumn-fmrTickerSymbol'],
        rightColIds: [],
      },
      columnVisibility: {
        hiddenColIds: ['checkbox', 'fmrTickerSymbol'],
      },
      sort: { sortModel: [] },
      filter: { filterModel: {} },
      pagination: { page: 0 },
      columnGroup: { openColumnGroupIds: [] },
      rowGroupExpansion: { expandedRowGroupIds: [] },
      rangeSelection: { cellRanges: [] },
      scroll: { top: 0, left: 0 },
      rowSelection: [],
    } as GridState,
  },
  {
    viewName: 'Broker Summary',
    description:
      'Pivot view grouped by Symbol and Broker with aggregated amounts',
    availableFor: ['EQTEXECUTIONSACTIVITYUI:TRADES'],
    gridState: {
      sideBar: {
        visible: true,
        position: 'right',
        openToolPanel: null,
        toolPanels: {
          columns: { expandedGroupIds: [] },
          filters: { expandedGroupIds: [], expandedColIds: [] },
        },
      },
      expandAll: false,
      rowGroup: {
        groupColIds: ['fmrTickerSymbol', 'executingBroker'],
      },
      aggregation: {
        aggregationModel: [
          { colId: 'executionQuantity', aggFunc: 'sum' },
          { colId: 'executionPricePerUnit', aggFunc: 'avgExecutedPrice' },
          { colId: 'tradeGrossAmount', aggFunc: 'tradeSum' },
          { colId: 'tradeGrossAmountRootCurrency', aggFunc: 'sum' },
          { colId: 'totalNetProceedsAmount', aggFunc: 'tradeNet' },
          { colId: 'totalNetProceedsAmountRoot', aggFunc: 'tradeNetUSD' },
        ],
      },
      pivot: {
        pivotMode: true,
        pivotColIds: [],
      },
      columnPinning: {
        leftColIds: [],
        rightColIds: [],
      },
      columnVisibility: {
        hiddenColIds: ['checkbox', 'executingBroker', 'fmrTickerSymbol'],
      },
      sort: { sortModel: [] },
      filter: { filterModel: {} },
      pagination: { page: 0 },
      columnGroup: { openColumnGroupIds: [] },
      rowGroupExpansion: { expandedRowGroupIds: [] },
      rangeSelection: { cellRanges: [] },
      scroll: { top: 0, left: 0 },
      rowSelection: [],
    } as GridState,
  },
  {
    viewName: 'Broker Summary',
    description:
      'Pivot view grouped by Symbol and Broker with aggregated amounts',
    availableFor: ['EQTEXECUTIONSACTIVITYUI:EXECUTIONS'],
    gridState: {
      sideBar: {
        visible: true,
        position: 'right',
        openToolPanel: null,
        toolPanels: {
          columns: { expandedGroupIds: [] },
          filters: { expandedGroupIds: [], expandedColIds: [] },
        },
      },
      expandAll: false,
      rowGroup: {
        groupColIds: ['fmrTickerSymbol', 'executingBroker'],
      },
      aggregation: {
        aggregationModel: [
          { colId: 'executionQuantity', aggFunc: 'sum' },
          { colId: 'executionPricePerUnit', aggFunc: 'avgExecutedPrice' },
          { colId: 'executionGrossAmount', aggFunc: 'tradeSum' },
          { colId: 'executionGrossRootCurrencyAmount', aggFunc: 'sum' },
          { colId: 'totalNetProceedsAmount', aggFunc: 'tradeNet' },
          { colId: 'totalNetProceedsAmountRoot', aggFunc: 'tradeNetUSD' },
        ],
      },
      pivot: {
        pivotMode: true,
        pivotColIds: [],
      },
      columnPinning: {
        leftColIds: [],
        rightColIds: [],
      },
      columnVisibility: {
        hiddenColIds: [
          'checkbox',
          'allocations',
          'fmrTickerSymbol',
          'executingBroker',
        ],
      },
      sort: { sortModel: [] },
      filter: { filterModel: {} },
      pagination: { page: 0 },
      columnGroup: { openColumnGroupIds: [] },
      rowGroupExpansion: { expandedRowGroupIds: [] },
      rangeSelection: { cellRanges: [] },
      scroll: { top: 0, left: 0 },
      rowSelection: [],
    } as GridState,
  },
  {
    viewName: 'Fund Summary',
    description:
      'Pivot view grouped by Symbol and Fund with aggregated amounts',
    availableFor: ['EQTEXECUTIONSACTIVITYUI:TRADES'],
    gridState: {
      sideBar: {
        visible: true,
        position: 'right',
        openToolPanel: null,
        toolPanels: {
          columns: { expandedGroupIds: [] },
          filters: { expandedGroupIds: [], expandedColIds: [] },
        },
      },
      expandAll: false,
      rowGroup: {
        groupColIds: ['fmrTickerSymbol', 'enteredFundShortName'],
      },
      aggregation: {
        aggregationModel: [
          { colId: 'executionQuantity', aggFunc: 'sum' },
          { colId: 'executionPricePerUnit', aggFunc: 'avgExecutedPrice' },
          { colId: 'tradeGrossAmount', aggFunc: 'tradeSum' },
          { colId: 'tradeGrossAmountRootCurrency', aggFunc: 'sum' },
          { colId: 'totalNetProceedsAmount', aggFunc: 'tradeNet' },
          { colId: 'totalNetProceedsAmountRoot', aggFunc: 'tradeNetUSD' },
        ],
      },
      pivot: {
        pivotMode: true,
        pivotColIds: [],
      },
      columnPinning: {
        leftColIds: [],
        rightColIds: [],
      },
      columnVisibility: {
        hiddenColIds: ['checkbox', 'fmrTickerSymbol', 'enteredFundShortName'],
      },
      sort: { sortModel: [] },
      filter: { filterModel: {} },
      pagination: { page: 0 },
      columnGroup: { openColumnGroupIds: [] },
      rowGroupExpansion: { expandedRowGroupIds: [] },
      rangeSelection: { cellRanges: [] },
      scroll: { top: 0, left: 0 },
      rowSelection: [],
    } as GridState,
  },
];
