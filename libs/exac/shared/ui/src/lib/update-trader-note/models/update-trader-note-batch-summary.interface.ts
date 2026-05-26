export interface XaEdit {
  tradingMessage: string;
}

export interface BatchChangeReplySummary {
  successCount: number;
  failureCount: number;
  allEdits: XaEdit[];
}
