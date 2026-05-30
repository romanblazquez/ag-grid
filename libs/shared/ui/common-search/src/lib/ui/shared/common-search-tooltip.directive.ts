import {
  Directive,
  HostListener,
  Input,
  OnDestroy,
} from '@angular/core';
import { MatTooltip } from '@angular/material/tooltip';
import { CommonSearchTooltip } from '../../model/common-search-tooltip.interface';

@Directive({
  selector: '[commonSearchTooltip]',
  providers: [MatTooltip],
  standalone: false,
})
export class CommonSearchTooltipDirective implements OnDestroy {
  @Input('commonSearchTooltip') public tooltip!: CommonSearchTooltip;
  @Input() public delay = 700;
  private timer: ReturnType<typeof setTimeout> | undefined;

  public constructor(public readonly matTooltip: MatTooltip) {}

  public ngOnDestroy(): void {
    this.clearTimer();
    this.matTooltip.hide();
  }

  @HostListener('mouseenter')
  @HostListener('focus')
  public onEnter(): void {
    this.timer = setTimeout(() => {
      this.showTooltip();
    }, this.delay);
  }

  @HostListener('mouseleave')
  @HostListener('blur')
  protected onLeave(): void {
    this.hideTooltip();
  }

  private showTooltip(): void {
    this.matTooltip.message = this.tooltip.column;
    this.matTooltip.show();
  }

  private hideTooltip(): void {
    if (this.matTooltip._isTooltipVisible()) {
      this.matTooltip.hide();
    }
    clearTimeout(this.timer);
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }
}
