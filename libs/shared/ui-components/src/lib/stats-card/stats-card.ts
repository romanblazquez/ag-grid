import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'lib-stats-card',
  imports: [CommonModule],
  templateUrl: './stats-card.html',
  styleUrl: './stats-card.css',
})
export class StatsCard {
  @Input() title = '';
  @Input() value: string | number = '';
  @Input() icon = '';
  @Input() trend?: 'up' | 'down';
  @Input() trendValue?: string;
}
