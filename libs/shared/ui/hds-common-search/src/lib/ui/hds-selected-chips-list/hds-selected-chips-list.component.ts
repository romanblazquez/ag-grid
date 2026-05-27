import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  input,
  output,
  viewChild,
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

  private readonly scrollContainer =
    viewChild<ElementRef<HTMLDivElement>>('scrollContainer');

  constructor() {
    let previousLength = 0;
    effect(() => {
      const length = this.items().length;
      // New chips are appended, so when the list grows scroll to the bottom
      // to keep the freshest pick in view even if the user had scrolled up
      // through older chips. Removals don't trigger a scroll.
      if (length > previousLength) {
        queueMicrotask(() => {
          const el = this.scrollContainer()?.nativeElement;
          if (el) el.scrollTop = el.scrollHeight;
        });
      }
      previousLength = length;
    });
  }

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
