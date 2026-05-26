import { ICellRendererParams } from 'ag-grid-community';
import { IRowNode, GridApi } from 'ag-grid-community';

/**
 * Formats a number value to the given decimal places with locale-aware grouping.
 * Returns an empty string when value is null / undefined / NaN.
 */
export function numberFormatter(
  params: ICellRendererParams | { value: number | null | undefined },
  decimals = 2,
): string {
  const value = params.value as number | null | undefined;
  if (value === null || value === undefined || isNaN(value as number)) {
    return '';
  }
  return (value as number).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Formats an ISO date-time string to a locale date-time string.
 * Returns an empty string when the input is falsy.
 */
export function getDateTimeGetter(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Copies text to clipboard using execCommand as a fallback when the
 * Clipboard API is unavailable.
 */
export function fallbackCopy(text: string): void {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    document.execCommand('copy');
  } finally {
    document.body.removeChild(textarea);
  }
}

/**
 * Briefly highlights the selected rows by triggering AG Grid's flash-cells API.
 */
export function flashAffectedRows(
  nodes: IRowNode[],
  gridApi: GridApi,
): void {
  nodes.forEach((node) => {
    if (node.data) {
      gridApi.flashCells({ rowNodes: [node] });
    }
  });
}
