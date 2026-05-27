import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Stub replacing the proprietary HdsIconComponent from @fmr-pr000264/hds-core-icons.
 *
 * Renders a simple span with a data attribute so that consuming templates
 * and CSS can reference the icon name without a hard dependency on the
 * proprietary icon library.
 */
/* eslint-disable @angular-eslint/component-selector */
@Component({
  selector: 'hds-icon',
  standalone: true,
  imports: [CommonModule],
  template: `<span class="hds-icon-stub" [attr.data-icon]="icon" [attr.data-size]="size"></span>`,
  styles: [
    `
      .hds-icon-stub {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 1rem;
        width: 1em;
        height: 1em;
      }
    `,
  ],
})
export class HdsIconComponent {
  @Input() public icon: string = '';
  @Input() public size: string = 'sm';
}
