export const DEFAULT_REASON_CODE = 'TDR';
export const DEFAULT_MODAL_DURATION = 5000;
export const MAX_TRADER_NOTE_LENGTH = 500;

export const SUCCESS_UPDATE_SINGLE = 'Successfully updated trader note for 1 execution';
export const SUCCESS_UPDATE_BATCH = (count: number): string =>
  `Successfully updated trader notes for ${count} execution(s)`;
export const ERROR_EXECUTION_ID_REQUIRED = 'Execution ID is required';
export const ERROR_NO_EXECUTIONS_BATCH = 'No executions provided for batch update.';
export const ERROR_UPDATE_FAILED_UNKNOWN = 'Update failed for unknown reason.';
export const ERROR_ALL_UPDATES_FAILED = 'All updates failed.';
export const ERROR_SOME_UPDATES_FAILED = 'Some updates failed.';
export const ERROR_RECORD_VERSION_MISSING = (id: string): string =>
  `Record version number is missing for execution ${id}. Please refresh the grid.`;
export const ERROR_CHANGE_SERVICE_URL_REQUIRED =
  'Change service URL (changeServiceUrl) is required but was not provided in dialog data.';
export const SNACKBAR_CLOSE = 'Close';
export const SINGLE_UPDATE_FAILED = (errorMsg: string): string =>
  `Single update failed: ${errorMsg}`;
export const BATCH_UPDATE_FAILED = (errorMsg: string): string =>
  `Batch update failed: ${errorMsg}`;
