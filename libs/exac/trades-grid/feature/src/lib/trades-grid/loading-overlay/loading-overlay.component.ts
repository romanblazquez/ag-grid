import { ILoadingOverlayAngularComp } from 'ag-grid-angular';
import { ILoadingOverlayParams } from 'ag-grid-community';
import { Component } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'tp-loading-overlay',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  template: `
    <div class="ag-overlay-loading-center">
      <mat-spinner></mat-spinner>
    </div>
  `,
})
export class LoadingOverlayComponent implements ILoadingOverlayAngularComp {
  public params!: ILoadingOverlayParams & { loadingMessage: string };

  public agInit(params: ILoadingOverlayParams & { loadingMessage: string }): void {
    this.params = params;
  }
}
