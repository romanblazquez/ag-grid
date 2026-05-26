import { ExecutionModel } from '@trade-platform/exac/shared/data';

export interface UpdateTraderNoteDialogData {
  executions: ExecutionModel[];
  changeServiceUrl: string;
}
