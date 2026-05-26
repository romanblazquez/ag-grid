import { TradeModel, ExecutionModel } from '@trade-platform/exac/shared/data';

export interface CancelResult {
  success: boolean;
  cancelledItems: (TradeModel | ExecutionModel)[];
  failedItems: (TradeModel | ExecutionModel)[];
  reason?: string;
}
