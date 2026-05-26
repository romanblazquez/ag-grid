import { ColumnState } from 'ag-grid-community';

export class PreferencesModel {
  public tradeColumnState: ColumnState[] = [];
  public tradeFilterState: { [key: string]: unknown } = {};

  public constructor(
    tradeColumnState: ColumnState[],
    tradeFilterState: { [key: string]: unknown },
  ) {
    this.tradeColumnState = tradeColumnState;
    this.tradeFilterState = tradeFilterState;
  }
}
