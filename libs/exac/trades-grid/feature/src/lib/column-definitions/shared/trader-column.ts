import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { PersonCacheService } from '@trade-platform/shared/data-access';
import {
  AG_SET_COLUMN_FILTER,
  AGGREGATE_UNIQUE_VALUES,
  SMALL_COLUMN_SIZE,
} from '../constants';

export function createTraderColumnDef(
  personCacheService: PersonCacheService,
  mappingValue = 'asExecutedTraderInitials',
): ColDef {
  const colDef: ColDef = {
    headerName: 'Trader',
    field: mappingValue,
    colId: mappingValue,
    minWidth: SMALL_COLUMN_SIZE,
    filter: AG_SET_COLUMN_FILTER,
    aggFunc: AGGREGATE_UNIQUE_VALUES,
    cellRenderer: (params: ICellRendererParams) => {
      if (params.node.group) {
        return (params.node.aggData as any)?.[mappingValue] || '';
      }
      return params.value || '';
    },
    tooltipValueGetter: (params): string => {
      if (params.node?.group) {
        const aggData = params.node.aggData as Record<string, string> | undefined;
        const aggValue: string | undefined = aggData?.[mappingValue];
        if (!aggValue) return '';
        return aggValue
          .split(', ')
          .map((value: string) => personCacheService.getFullNameFromInitial(value))
          .join(', ');
      }
      if (!params.value) return '';
      return personCacheService.getFullNameFromInitial(params.value as string);
    },
  };
  return colDef;
}
