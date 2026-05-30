import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { ChipContext } from '../model/chip-context.model';

@Component({
  selector: 'fmr-pr000539-selection-chips',
  templateUrl: './selection-chips.component.html',
  styleUrls: ['./selection-chips.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class SelectionChipsComponent {
  public isOpen: boolean[] = [];
  public hasEnteredOverlay = false;

  public constructor(private readonly cd: ChangeDetectorRef) {}

  @Input()
  public set chipContexts(contexts: ChipContext[]) {
    this.chips = contexts;
    this.chips.forEach((chip) => this.isOpen.push(false));
    this.cd.detectChanges();
  }
  public chips: ChipContext[] = [];
  @Output()
  public removeItem: EventEmitter<{ context: string; value: string }> =
    new EventEmitter<{ context: string; value: string }>();

  @Output()
  public removeContext: EventEmitter<string> = new EventEmitter<string>();

  public getChipLabel(name: string, item: string): string {
    return `${name}: ${item}`;
  }

  public getAltChipLabel(name: string, num: number): string {
    return `${name} (${num})`;
  }

  public remove(context: string, value: string): void {
    this.removeItem.emit({ context, value });
  }

  public removeAll(name: string): void {
    this.removeContext.emit(name);
  }

  public updateIsOpen(index: number): void {
    this.isOpen.forEach((o, index) => (this.isOpen[index] = false));
    this.isOpen[index] = !this.isOpen[index];
  }

  public enteredOverlay(i: number): void {
    this.hasEnteredOverlay = true;
  }

  public leftChip(i: number): void {
    setTimeout(() => {
      if (!this.hasEnteredOverlay) this.isOpen[i] = false;
      this.hasEnteredOverlay = false;
    }, 200);
  }
}
