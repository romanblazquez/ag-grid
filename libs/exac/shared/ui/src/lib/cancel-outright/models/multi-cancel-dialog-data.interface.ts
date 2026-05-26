import { TradeModel, ExecutionModel } from '@trade-platform/exac/shared/data';

export interface MultiCancelDialogData {
  selectedTrades: TradeModel[];
  selectedExecutions: ExecutionModel[];
  cancelType: 'trades' | 'executions' | 'mixed';
  cancelServiceUrl: string;
}
