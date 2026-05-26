import {
  ChangeDetectorRef,
  Component,
  NgZone,
  OnDestroy,
} from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

@Component({
  selector: 'tp-allocation-render',
  standalone: true,
  imports: [],
  templateUrl: './allocation-render.component.html',
  styleUrl: './allocation-render.component.scss',
})
export class AllocationRenderComponent
  implements ICellRendererAngularComp, OnDestroy
{
  public params!: ICellRendererParams;
  public isGroup = false;
  public isExpandable = false;
  public isExpanded = false;
  public label = '';

  private expansionCheckInterval: ReturnType<typeof setInterval> | null = null;

  public constructor(
    private readonly cd: ChangeDetectorRef,
    private readonly ngZone: NgZone,
  ) {}

  private updateState(params: ICellRendererParams): void {
    this.params = params;
    this.isGroup = !!params.node.group;

    const rowGroupColumns = params.api.getRowGroupColumns();
    const currentColId = params.colDef?.colId ?? params.colDef?.field;
    const lastGroupCol =
      rowGroupColumns.length > 0
        ? rowGroupColumns[rowGroupColumns.length - 1]
        : null;

    const isLastGroupColumn =
      !!lastGroupCol &&
      `ag-Grid-AutoColumn-${lastGroupCol.getColDef().colId}` === currentColId;

    const hasMasterDetail = !!params.api.getGridOption('masterDetail');
    const isLeafNode = !this.isGroup && !!params.node.data && isLastGroupColumn;
    const isMasterDetailNode = isLeafNode && hasMasterDetail;

    this.isExpandable = isMasterDetailNode;
    this.isExpanded = isMasterDetailNode ? params.node.expanded : false;

    this.label = this.isGroup
      ? typeof params.value === 'string'
        ? params.value
        : typeof params.node.key === 'string'
          ? params.node.key
          : 'Blank'
      : typeof params.value === 'string'
        ? params.value
        : '';
  }

  public agInit(params: ICellRendererParams): void {
    this.updateState(params);
    this.startExpansionTracking();
  }

  public refresh(params: ICellRendererParams): boolean {
    this.updateState(params);
    return true;
  }

  public ngOnDestroy(): void {
    this.stopExpansionTracking();
  }

  private startExpansionTracking(): void {
    this.ngZone.runOutsideAngular(() => {
      this.expansionCheckInterval = setInterval(() => {
        if (this.isExpandable) {
          const currentExpansion = this.params.node.expanded;
          if (currentExpansion !== this.isExpanded) {
            this.ngZone.run(() => {
              this.isExpanded = currentExpansion;
              this.cd.markForCheck();
            });
          }
        }
      }, 100);
    });
  }

  private stopExpansionTracking(): void {
    if (this.expansionCheckInterval) {
      clearInterval(this.expansionCheckInterval as unknown as number);
      this.expansionCheckInterval = null;
    }
  }

  public toggleExpand(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    this.params.node.setExpanded(!this.params.node.expanded);
    this.isExpanded = !this.isExpanded;
  }
}
