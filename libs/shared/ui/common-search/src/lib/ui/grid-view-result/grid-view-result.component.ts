import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { Observable } from 'rxjs';
import { Context } from '../../model/context.model';
import { AbstractData } from '../../model/solr-response.model';
import { CommonSearchSelection } from '../../model/common-search-selection.interface';
import { AutoToggle } from '../../model/auto-toggle.interface';
import { CommonSearchStore } from '../../data-access/store/common-search.store';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'fmr-pr000539-grid-view-result',
  templateUrl: './grid-view-result.component.html',
  styleUrls: ['./grid-view-result.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class GridViewResultComponent<T> implements OnInit, OnDestroy {
  @Input() public viewContext!: Context;
  @Output() public selected = new EventEmitter<CommonSearchSelection>();
  public multiselectRows?: Array<MultiselectData>;
  public prevSelected: Array<AbstractData> = [];
  public autoSearchActive$!: Observable<boolean>;
  public autoSelect$!: Observable<string | null>;
  public autoSelectVal!: string | null;
  private readonly destroy$ = new Subject();

  public constructor(private readonly commonSearchStore: CommonSearchStore) {}

  @Input()
  public set searchResults(results: Array<any> | undefined) {
    if (results && results.length > 0) {
      this.generateMultiselectData(results);
    }
  }

  @Input()
  public set clearSelection(clear: any) {
    if (clear) {
      this.multiselectRows?.forEach((row) => {
        row.selected = false;
      });
      this.prevSelected = [];
      this.emitSelectedValues();
    }
  }

  @Input()
  public set autoToggle(obj: AutoToggle | undefined) {
    if (obj) {
      if (obj.deselect) {
        const deselectItem = obj.deselect;
        this.findRowAndToggle(deselectItem, false);
      }
    }
  }

  @Input() public disableRule: (node: MultiselectData) => boolean = (node) =>
    false;

  public ngOnInit(): void {
    this.autoSelect$
      .pipe(takeUntil(this.destroy$))
      .subscribe((val) => (this.autoSelectVal = val));

    this.autoSearchActive$.pipe(takeUntil(this.destroy$)).subscribe((val) => {
      if (val) {
        if (this.autoSelectVal && this.autoSelectVal.length > 0) {
          this.autoSelectVal.split(',').forEach((name) => {
            this.findRowAndToggle(name, true);
          });
        }
      }
    });
  }

  public ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.complete();
  }

  public onSingleRowSelected(row: MultiselectData): void {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const data = [row.data];
    const values = this.getSelected(data) as Array<string>;
    this.selected.emit({
      data,
      values,
      displayText: this.getDisplayText(data) as Array<string>,
    });
    this.prevSelected = data;
  }

  public onMultiselectRowClick(
    row: MultiselectData,
    selectOnly: boolean,
  ): void {
    // check if row is disabled before allowing selection
    if (this.disableRule(row)) return;

    row.selected = selectOnly ? true : !row.selected;
    this.emitSelectedValues();
  }

  public emitSelectedValues(): void {
    const selectedData: AbstractData[] =
      this.multiselectRows
        ?.filter((row) => row.selected)
        .map((row: MultiselectData) => row.data) ?? [];
    this.prevSelected = selectedData;

    this.selected.emit({
      data: selectedData,
      values: this.getSelected(selectedData) as Array<string>,
      displayText: this.getDisplayText(selectedData) as Array<string>,
    });
  }

  public getSearchResultByColumn(
    searchResult: T,
    searchResultColumn: string,
  ): string {
    return (searchResult as Record<string, unknown>)[
      searchResultColumn
    ] as string;
  }

  protected filterInvisibleFields(
    fields: Array<AbstractData>,
  ): Array<AbstractData> {
    return fields.filter((field) => field['visible']);
  }

  protected generateMultiselectData(searchResults: Array<any>): void {
    this.multiselectRows = searchResults.map((searchResult) => {
      const multiselectData: MultiselectData = {
        selected: false,
        data: searchResult as AbstractData,
      };
      if (
        this.prevSelected.some(
          (row: AbstractData) =>
            JSON.stringify(row) === JSON.stringify(multiselectData.data),
        )
      ) {
        multiselectData.selected = true;
      }
      return multiselectData;
    });
  }

  protected findRowAndToggle(name: string, selectOnly: boolean): void {
    const row = this.multiselectRows?.filter((rowData) => {
      const vals = Object.values(rowData.data);
      return vals.some((val) => {
        const strVal = `${val}`.replace(/\s/g, '').toUpperCase();
        const str = `${name}`.replace(/\s/g, '').toUpperCase();
        return strVal === str;
      });
    })[0];
    if (row) {
      this.onMultiselectRowClick(row, selectOnly);
    }
  }

  private getSelected(data: AbstractData[]): any[] {
    return data.map((v: AbstractData) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return v[this.viewContext.emitField];
    });
  }

  private getDisplayText(data: AbstractData[]): any[] {
    return data.map((v: AbstractData) => {
      const fieldToUse =
        v[this.viewContext.detailFields[0].name] &&
        (v[this.viewContext.detailFields[0].name] as string).length > 0
          ? this.viewContext.detailFields[0].name
          : this.viewContext.emitField;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return v[fieldToUse];
    });
  }
}

export interface MultiselectData {
  selected: boolean;
  data: AbstractData;
}
