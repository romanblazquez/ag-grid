import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'tp-row-group-tooltip',
  standalone: true,
  imports: [MatTooltipModule],
  template: `
    <div
      [matTooltip]="params.value"
      matTooltipPosition="below"
      class="ag-cell-value"
    >
      {{ params.value }}
    </div>
  `,
  styles: ['::ng-deep .mdc-tooltip { font-size: 12px!important; }'],
})
export class RowGroupTooltipComponent implements ICellRendererAngularComp {
  public params!: ICellRendererParams;

  public agInit(params: ICellRendererParams): void {
    this.params = params;
  }

  public refresh(params: ICellRendererParams): boolean {
    this.params = params;
    return false;
  }
}
