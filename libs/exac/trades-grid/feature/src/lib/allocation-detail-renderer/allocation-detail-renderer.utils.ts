import { GridApi } from 'ag-grid-community';
import {
  excelStyles,
  initialGroupOrderComparator,
} from '../column-definitions/shared-definition-options';
import { TradesGridComponent } from '../trades-grid/trades-grid.component';

/**
 * Calculates the height required to show all rows in the inner ag-grid
 * without virtual scrolling, by summing displayed row heights and adding
 * chrome (header, optional pagination/status bars) measured from the DOM.
 */
export function calcFullGridHeight(
  sectionElem: HTMLElement,
  innerGridApi?: GridApi,
): number {
  if (!innerGridApi) return sectionElem.offsetHeight;

  const DEFAULT_HEADER_HEIGHT = 32;
  const BUFFER = 4;

  const themeRowHeight = innerGridApi.getSizesForCurrentTheme().rowHeight;

  let totalRowsHeight = 0;
  innerGridApi.forEachNodeAfterFilterAndSort((node) => {
    const rh = node.rowHeight;
    totalRowsHeight += rh != null ? rh : themeRowHeight;
  });

  const headerEl = sectionElem.querySelector<HTMLElement>('.ag-header');
  const headerHeight = headerEl ? headerEl.offsetHeight : DEFAULT_HEADER_HEIGHT;

  const footerEl = sectionElem.querySelector<HTMLElement>(
    '.ag-floating-bottom, .ag-paging-panel, .ag-status-bar',
  );
  const footerHeight = footerEl ? footerEl.offsetHeight : 0;

  return headerHeight + totalRowsHeight + footerHeight + BUFFER;
}

export function overrideGridOptions(tradesGridInstance: TradesGridComponent): any {
  return {
    ...tradesGridInstance.gridOptions,
    suppressAggFuncInHeader: true,
    excelStyles: excelStyles,
    aggFuncs: null,
    initialGroupOrderComparator: initialGroupOrderComparator,
    enableCharts: true,
    masterDetail: false,
    tooltipShowDelay: 0,
    rowGroupPanelShow: 'never',
    suppressHorizontalScroll: false,
    sideBar: {
      toolPanels: [
        {
          id: 'columns',
          labelDefault: 'Columns',
          labelKey: 'columns',
          iconKey: 'columns',
          toolPanel: 'agColumnsToolPanel',
          toolPanelParams: {
            suppressRowGroups: true,
            suppressValues: true,
            suppressPivotMode: true,
          },
          minWidth: 225,
          maxWidth: 225,
          width: 225,
        },
      ],
      defaultToolPanel: 'columns',
    },
  };
}
