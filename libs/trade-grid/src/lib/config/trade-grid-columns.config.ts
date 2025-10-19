import { ColDef } from 'ag-grid-community';
import { CancelledByCellComponent } from '../cancelled-by-cell/cancelled-by-cell.component';

/**
 * Person service interface for getting person details
 */
export interface PersonService {
  getPersonById(id: string): Person | undefined;
  getAllPersons(): Person[];
}

/**
 * Person model interface
 */
export interface Person {
  id: string;
  fullName: string;
  initials: string;
}

/**
 * Trade data model interface
 */
export interface TradeData {
  id: string;
  symbol: string;
  price: number;
  quantity: number;
  side: 'BUY' | 'SELL';
  timestamp: Date;
  trader: string;
  status: 'ACTIVE' | 'CANCELLED' | 'FILLED' | 'PENDING';
  cancelledBy?: string;
}

/**
 * Configuration class for trade grid column definitions
 * Follows the monorepo pattern of separating configuration from components
 */
export class TradeGridColumnsConfig {
  /**
   * Creates column definitions for the trade grid
   * @param personService - Service to get person details for cancelled by column
   * @param isDarkTheme - Whether to use dark theme colors (optional)
   * @returns Array of column definitions
   */
  static createColumnDefinitions(
    personService: PersonService,
    isDarkTheme = true
  ): ColDef[] {
    // Theme-aware colors
    const buyColor = isDarkTheme ? '#4ade80' : '#16a34a';
    const sellColor = isDarkTheme ? '#f87171' : '#dc2626';
    const filledColor = isDarkTheme ? '#4ade80' : '#16a34a';
    const partialColor = isDarkTheme ? '#fbbf24' : '#d97706';
    const pendingColor = isDarkTheme ? '#60a5fa' : '#2563eb';
    const cancelledColor = isDarkTheme ? '#9ca3af' : '#6b7280';
    const defaultColor = isDarkTheme ? '#e5e7eb' : '#0f172a';

    // Base cell style for all cells to ensure proper text color
    const baseCellStyle = {
      color: defaultColor,
    };

    return [
      {
        field: 'timestamp',
        headerName: 'Time',
        width: 120,
        sortable: true,
        filter: 'agDateColumnFilter',
        filterParams: {
          comparator: (filterLocalDateAtMidnight: Date, cellValue: string | Date) => {
            const cellDate = new Date(cellValue);
            const filterDate = filterLocalDateAtMidnight;
            
            if (cellDate < filterDate) return -1;
            if (cellDate > filterDate) return 1;
            return 0;
          },
          suppressAndOrCondition: false, // Allow AND/OR conditions
          browserDatePicker: true, // Use browser's native date picker
        },
        cellStyle: baseCellStyle,
        valueFormatter: (params) => {
          return new Date(params.value).toLocaleTimeString();
        },
      },
      {
        field: 'symbol',
        headerName: 'Symbol',
        width: 100,
        sortable: true,
        filter: 'agSetColumnFilter', // Changed to set filter for better symbol filtering
        filterParams: {
          values: undefined, // Will auto-populate from data
          suppressSelectAll: false,
          suppressSorting: false,
          caseSensitive: false,
        },
        enableRowGroup: true,
        rowGroup: false,
        showRowGroup: true, // Show grouped column values
        cellStyle: baseCellStyle,
        // Group cell renderer for better display when grouped
        cellRendererParams: {
          suppressCount: false, // Show count in group headers
        },
      },
      {
        field: 'side',
        headerName: 'Side',
        width: 80,
        sortable: true,
        filter: 'agSetColumnFilter',
        filterParams: {
          values: ['BUY', 'SELL'], // Explicitly set the available values
          suppressSelectAll: false,
          suppressSorting: false,
          caseSensitive: false,
        },
        enableRowGroup: true,
        rowGroup: false,
        showRowGroup: true, // Show grouped column values
        cellRendererParams: {
          suppressCount: false, // Show count in group headers
        },
        cellStyle: (params) => {
          const style: Record<string, string> =
            params.value === 'BUY'
              ? { color: buyColor, fontWeight: 'bold' }
              : { color: sellColor, fontWeight: 'bold' };
          return style;
        },
      },
      {
        field: 'quantity',
        headerName: 'Quantity',
        width: 120,
        sortable: true,
        filter: 'agNumberColumnFilter',
        filterParams: {
          allowedCharPattern: '\\d\\-\\,', // Allow digits, commas, and minus
          numberParser: (text: string) => {
            return text == null ? null : parseFloat(text.replace(/,/g, ''));
          },
          suppressAndOrCondition: false, // Allow AND/OR conditions
        },
        enableValue: true,
        aggFunc: 'sum',
        allowedAggFuncs: ['sum', 'avg', 'count'], // Multiple aggregation options
        cellStyle: baseCellStyle,
        valueFormatter: (params) => {
          const value = params.value;
          if (typeof value === 'number' && !isNaN(value)) {
            return value.toLocaleString();
          }
          return '0';
        },
      },
      {
        field: 'price',
        headerName: 'Price',
        width: 120,
        sortable: true,
        filter: 'agNumberColumnFilter',
        filterParams: {
          allowedCharPattern: '\\d\\-\\.\\,\\$', // Allow digits, commas, dots, dollar signs, and minus
          numberParser: (text: string) => {
            return text == null ? null : parseFloat(text.replace(/[$,]/g, ''));
          },
          suppressAndOrCondition: false, // Allow AND/OR conditions
        },
        enableValue: true,
        aggFunc: 'avg',
        allowedAggFuncs: ['avg', 'min', 'max', 'count'], // Multiple aggregation options
        cellStyle: baseCellStyle,
        valueFormatter: (params) => {
          const value = params.value;
          if (typeof value === 'number' && !isNaN(value)) {
            return `$${value.toFixed(2)}`;
          }
          return '$0.00';
        },
      },
      {
        field: 'trader',
        headerName: 'Trader',
        width: 120,
        sortable: true,
        filter: 'agSetColumnFilter', // Changed to set filter for better trader filtering
        filterParams: {
          values: undefined, // Will auto-populate from data
          suppressSelectAll: false,
          suppressSorting: false,
          caseSensitive: false,
        },
        enableRowGroup: true,
        rowGroup: false,
        showRowGroup: true, // Show grouped column values
        cellRendererParams: {
          suppressCount: false, // Show count in group headers
        },
        cellStyle: baseCellStyle,
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 100,
        sortable: true,
        filter: 'agSetColumnFilter',
        filterParams: {
          values: ['ACTIVE', 'CANCELLED', 'FILLED', 'PENDING'], // Explicitly set status values
          suppressSelectAll: false,
          suppressSorting: false,
          caseSensitive: false,
        },
        enableRowGroup: true,
        rowGroup: false,
        showRowGroup: true, // Show grouped column values
        cellRendererParams: {
          suppressCount: false, // Show count in group headers
        },
        cellStyle: (params) => {
          const status = params.value;
          const style: Record<string, string> = { fontWeight: 'bold' };

          switch (status) {
            case 'FILLED':
              style['color'] = filledColor;
              break;
            case 'PARTIALLY_FILLED':
              style['color'] = partialColor;
              break;
            case 'PENDING':
              style['color'] = pendingColor;
              break;
            case 'CANCELLED':
              style['color'] = cancelledColor;
              break;
            default:
              style['color'] = defaultColor;
          }

          return style;
        },
      },
      {
        field: 'cancelledBy',
        headerName: 'Cancelled By',
        width: 120,
        sortable: true,
        filter: 'agSetColumnFilter', // Changed to set filter for better person filtering
        filterParams: {
          values: undefined, // Will auto-populate from data
          suppressSelectAll: false,
          suppressSorting: false,
          caseSensitive: false,
        },
        cellRenderer: CancelledByCellComponent,
        enableRowGroup: true,
        rowGroup: false,
        cellStyle: baseCellStyle,
        valueGetter: (params) => {
          const trade = params.data;
          if (!trade || trade.status !== 'CANCELLED' || !trade.cancelledBy) {
            return null;
          }

          const person = personService.getPersonById(trade.cancelledBy);
          return person ? person.fullName : `Unknown (${trade.cancelledBy})`;
        },
        cellRendererParams: {
          getPersonService: () => personService,
        },
      },
    ];
  }

  /**
   * Creates default column definition for the trade grid
   * @param isDarkTheme - Whether to use dark theme colors (optional)
   * @returns Default column definition object
   */
  static createDefaultColDef(isDarkTheme = true): ColDef {
    const defaultColor = isDarkTheme ? '#e5e7eb' : '#0f172a';
    
    return {
      flex: 1,
      minWidth: 100,
      resizable: true,
      sortable: true,
      filter: true,
      floatingFilter: true, // Enable floating filters for better UX
      enableRowGroup: false,
      enablePivot: false,
      enableValue: false,
      cellStyle: {
        color: defaultColor
      },
    };
  }

  /**
   * Creates a default person service with mock data
   * Used as fallback when no person service is provided
   * @returns PersonService with mock data
   */
  static createDefaultPersonService(): PersonService {
    const persons: Person[] = [
      { id: 'user1', fullName: 'John Smith', initials: 'JS' },
      { id: 'user2', fullName: 'Jane Doe', initials: 'JD' },
      { id: 'user3', fullName: 'Michael Johnson', initials: 'MJ' },
      { id: 'user4', fullName: 'Sarah Wilson', initials: 'SW' },
      { id: 'user5', fullName: 'David Brown', initials: 'DB' },
    ];

    return {
      getPersonById: (id: string) => persons.find((p) => p.id === id),
      getAllPersons: () => persons,
    };
  }
}
