import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { CheckboxModule } from 'primeng/checkbox';
import { FormsModule } from '@angular/forms';
import { NgClass, NgStyle } from '@angular/common';
import {
  AbstractData,
  CommonSearchSelection,
  CommonSearchValue,
} from '../../model/search-result.model';
import { Context } from '../../model/search-context.model';
import { AutoToggle } from '../../model/auto-toggle.interface';
import { HdsSelectedChipsListComponent } from '../hds-selected-chips-list/hds-selected-chips-list.component';

export interface MultiselectRow {
  selected: boolean;
  data: AbstractData;
}

@Component({
  selector: 'lib-hds-grid-view-result',
  templateUrl: './hds-grid-view-result.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CheckboxModule,
    FormsModule,
    NgClass,
    NgStyle,
    HdsSelectedChipsListComponent,
  ],
})
export class HdsGridViewResultComponent {
  readonly viewContext = input.required<Context>();
  readonly searchResults = input<AbstractData[]>([]);
  readonly autoToggle = input<AutoToggle | undefined>(undefined);
  readonly clearSelection = input<object | undefined>(undefined);
  readonly disableRule = input<(row: MultiselectRow) => boolean>(() => false);
  readonly disableSelected = input<boolean>(true);
  readonly preSelected = input<AbstractData[]>([]);
  readonly query = input<string>('');
  readonly maxSelectedRows = input<number>(0);

  readonly selected = output<CommonSearchSelection>();
  readonly chipRemoved = output<string>();

  readonly rows = signal<MultiselectRow[]>([]);

  readonly visibleFields = computed(() =>
    this.viewContext().detailFields.filter((f) => f.visible),
  );

  readonly resultCount = computed(() => this.rows().length);
  readonly formattedResultCount = computed(() =>
    this.resultCount().toLocaleString('en-US'),
  );

  readonly isRowDisabled = (row: MultiselectRow): boolean =>
    this.disableRule()(row) || (this.disableSelected() && row.selected);

  constructor() {
    effect(() => {
      const results = this.searchResults();
      const emitKey = this.viewContext().emitField;
      const preKeys = new Set(
        this.preSelected().map((d) => d[emitKey] as string),
      );
      untracked(() => {
        this.rows.set(
          results.map((data) => ({
            selected: preKeys.has(data[emitKey] as string),
            data,
          })),
        );
      });
    });

    effect(() => {
      const clear = this.clearSelection();
      if (clear) {
        untracked(() => {
          this.rows.update((rows) =>
            rows.map((r) => ({ ...r, selected: false })),
          );
          this.emitSelected();
        });
      }
    });

    effect(() => {
      const toggle = this.autoToggle();
      const deselect = toggle?.deselect;
      if (deselect) {
        untracked(() => this.findAndToggle(deselect, false));
      }
    });
  }

  toggle(row: MultiselectRow, selectOnly = false): void {
    if (this.isRowDisabled(row)) return;
    this.rows.update((rows) =>
      rows.map((r) =>
        r === row ? { ...r, selected: selectOnly ? true : !r.selected } : r,
      ),
    );
    this.emitSelected();
  }

  toggleSingle(row: MultiselectRow): void {
    const data = [row.data];
    this.selected.emit({
      data,
      values: this.extractValues(data),
      displayText: this.extractDisplayText(data),
    });
  }

  emitSelected(): void {
    const selectedData = this.rows()
      .filter((r) => r.selected)
      .map((r) => r.data);
    this.selected.emit({
      data: selectedData,
      values: this.extractValues(selectedData),
      displayText: this.extractDisplayText(selectedData),
    });
  }

  getCell(data: AbstractData, fieldName: string): string {
    return (data[fieldName] as string) ?? '';
  }

  private findAndToggle(name: string, selectOnly: boolean): void {
    const normalised = name.replace(/\s/g, '').toUpperCase();
    const row = this.rows().find((r) =>
      Object.values(r.data).some(
        (v) => `${v}`.replace(/\s/g, '').toUpperCase() === normalised,
      ),
    );
    if (!row) return;
    if (!selectOnly) {
      this.rows.update((rows) =>
        rows.map((r) => (r === row ? { ...r, selected: false } : r)),
      );
      this.emitSelected();
      return;
    }
    this.toggle(row, true);
  }

  private extractValues(data: AbstractData[]): CommonSearchValue[] {
    return data
      .map((d) => d[this.viewContext().emitField])
      .filter(
        (value): value is CommonSearchValue =>
          typeof value === 'string' || typeof value === 'number',
      );
  }

  private extractDisplayText(data: AbstractData[]): string[] {
    return data.map((d) => {
      const primary = this.viewContext().detailFields[0]?.name;
      const fallback = this.viewContext().emitField;
      const val = d[primary] as string;
      return val && val.length > 0 ? val : (d[fallback] as string);
    });
  }
}
