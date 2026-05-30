import { appDefaultViewsMap } from './app-default-views.config';

describe('appDefaultViewsMap', () => {
  it('should have EQTEXECUTIONSACTIVITYUI:EXECUTIONS configuration', () => {
    const config = appDefaultViewsMap['EQTEXECUTIONSACTIVITYUI:EXECUTIONS'];
    expect(config).toBeDefined();
    expect(config.appName).toBe('Block Executions');
    expect(config.viewName).toBe('Default Block View');
  });

  it('should have EQTEXECUTIONSACTIVITYUI:TRADES configuration', () => {
    const config = appDefaultViewsMap['EQTEXECUTIONSACTIVITYUI:TRADES'];
    expect(config).toBeDefined();
    expect(config.appName).toBe('Fund Executions');
    expect(config.viewName).toBe('Default Fund View');
  });

  it('should have correct aggregation model for EXECUTIONS', () => {
    const config = appDefaultViewsMap['EQTEXECUTIONSACTIVITYUI:EXECUTIONS'];
    const aggregationModel = config.gridState.aggregation?.aggregationModel;

    expect(aggregationModel).toBeDefined();
    expect(aggregationModel?.length).toBe(9);
    expect(aggregationModel).toContainEqual({
      colId: 'executingBroker',
      aggFunc: 'brokers',
    });
    expect(aggregationModel).toContainEqual({
      colId: 'executionGrossAmount',
      aggFunc: 'tradeSum',
    });
    expect(aggregationModel).toContainEqual({
      colId: 'executionQuantity',
      aggFunc: 'sum',
    });
  });

  it('should have correct aggregation model for TRADES', () => {
    const config = appDefaultViewsMap['EQTEXECUTIONSACTIVITYUI:TRADES'];
    const aggregationModel = config.gridState.aggregation?.aggregationModel;

    expect(aggregationModel).toBeDefined();
    expect(aggregationModel?.length).toBe(9);
    expect(aggregationModel).toContainEqual({
      colId: 'executingBroker',
      aggFunc: 'brokers',
    });
    expect(aggregationModel).toContainEqual({
      colId: 'tradeGrossAmount',
      aggFunc: 'tradeSum',
    });
    expect(aggregationModel).toContainEqual({
      colId: 'executionQuantity',
      aggFunc: 'sum',
    });
  });

  it('should use different gross amount column IDs for EXECUTIONS and TRADES', () => {
    const executionsConfig =
      appDefaultViewsMap['EQTEXECUTIONSACTIVITYUI:EXECUTIONS'];
    const tradesConfig = appDefaultViewsMap['EQTEXECUTIONSACTIVITYUI:TRADES'];

    const executionsGrossAmount =
      executionsConfig.gridState.aggregation?.aggregationModel?.find(
        (agg) => agg.aggFunc === 'tradeSum',
      );
    const tradesGrossAmount =
      tradesConfig.gridState.aggregation?.aggregationModel?.find(
        (agg) => agg.aggFunc === 'tradeSum',
      );

    expect(executionsGrossAmount?.colId).toBe('executionGrossAmount');
    expect(tradesGrossAmount?.colId).toBe('tradeGrossAmount');
  });
});
