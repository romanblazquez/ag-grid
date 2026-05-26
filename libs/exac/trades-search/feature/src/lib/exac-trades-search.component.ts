import {
  ChangeDetectionStrategy,
  Component,
} from '@angular/core';
import { TradesSearchComponent } from '@trade-platform/trades-search/feature';

@Component({
  selector: 'tp-exac-trades-search',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TradesSearchComponent],
  template: '<lib-trades-search></lib-trades-search>',
})
export class ExacTradesSearchComponent {}
