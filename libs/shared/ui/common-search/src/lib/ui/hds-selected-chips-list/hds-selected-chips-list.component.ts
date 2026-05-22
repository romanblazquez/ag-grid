import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { CheckboxModule } from 'primeng/checkbox';
import { FormsModule } from '@angular/forms';
import { NgStyle } from '@angular/common';
import { AbstractData } from '../../model/search-result.model';
import { DetailField } from '../../model/search-context.model';

@Component({
  selector: 'lib-hds-selected-chips-list',
  templateUrl: './hds-selected-chips-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CheckboxModule, FormsModule, NgStyle],
})
export class HdsSelectedChipsListComponent {
  readonly items = input<AbstractData[]>([]);
  readonly fields = input<DetailField[]>([]);
  readonly fieldWidths = input<Record<string, number>>({});
  readonly emitField = input<string>('');
  /** Max rows visible before the list becomes scrollable. 0 = no limit. */
  readonly maxRows = input<number>(0);

  readonly removed = output<string>();

  readonly visibleFields = computed(() =>
    this.fields().filter((f) => f.visible),
  );

  removeItem(item: AbstractData): void {
    const key = this.emitField();
    this.removed.emit((item[key] as string) ?? '');
  }

  getCell(item: AbstractData, fieldName: string): string {
    return (item[fieldName] as string) ?? '';
  }

  rowKey(item: AbstractData): string {
    const key = this.emitField();
    return (item[key] as string) ?? JSON.stringify(item);
  }
}
