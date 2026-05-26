import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  OnDestroy,
  Signal,
  ViewChild,
  computed,
} from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { AgGridAngular } from 'ag-grid-angular';
import {
  autoGroupColumnDef,
  defaultColDef,
} from '../column-definitions/shared-definition-options';
import { allocationsColumnDefs } from '../column-definitions/allocations-column-defs';
import { IprefName } from '@trade-platform/exac/trades-grid/data';
import { TradesGridComponent } from '../trades-grid/trades-grid.component';
import {
  GridApi,
  GridReadyEvent,
  ICellRendererParams,
  IRowNode,
} from 'ag-grid-community';
import { ExecutionModel } from '@trade-platform/exac/shared/data';
import { AllocationsStore } from './allocation-store/allocations.store';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SizeChangedEvent, VerticalResizeDirective } from '@trade-platform/shared/ui/vertical-resize';
import {
  calcFullGridHeight,
  overrideGridOptions,
} from './allocation-detail-renderer.utils';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { AllocationModel } from '@trade-platform/exac/shared/data';

@Component({
  selector: 'tp-allocation-detail-renderer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [AgGridAngular, VerticalResizeDirective, MatSlideToggleModule],
  templateUrl: 'allocation-detail-renderer.component.html',
  styleUrl: 'allocation-detail-renderer.component.scss',
  providers: [AllocationsStore],
})
export class AllocationDetailRendererComponent
  implements ICellRendererAngularComp, OnDestroy
{
  public readonly tradesGridInstance = inject(TradesGridComponent);
  public readonly allocationsStore = inject(AllocationsStore);
  public readonly cd = inject(ChangeDetectorRef);
  public readonly destroyRef = inject(DestroyRef);

  public title = 'Fund Allocations';
  public columnDefs = allocationsColumnDefs;
  public iPrefAppName = IprefName.Allocations;
  public params?: ICellRendererParams;

  public readonly defaultColDef = defaultColDef;
  public readonly autoGroupColumnDef = autoGroupColumnDef;
  public gridOptions: unknown = overrideGridOptions(this.tradesGridInstance);

  /** Converts computed signal to a readable value for the template */
  public rowData(): AllocationModel[] | null {
    return this.allocationsStore.filteredAllocations$();
  }

  @ViewChild('allocationDetailElem', { read: ElementRef })
  protected allocationDetailElem?: ElementRef<HTMLDivElement>;

  private heightBeforeExpand: number | null = null;
  private innerGridApi?: GridApi;

  public agInit(params: ICellRendererParams): void {
    this.params = params;
    this.hideAllOtherDetails();
    this.setCorrectHeightOnRowsRetrieved();
  }

  public refresh(params: any): boolean {
    return false;
  }

  public ngOnDestroy(): void {
    if (this.params?.node) {
      this.params.node.setRowHeight(null);
    }
    this.heightBeforeExpand = null;
    this.innerGridApi = undefined;
  }

  public onGridReady(event: GridReadyEvent): void {
    this.innerGridApi = event.api;
    event.api.setSideBarVisible(true);
    const executionId = (this.params?.data as ExecutionModel | undefined)?.executionId;
    if (executionId) this.allocationsStore.loadAllocations(executionId);
    setTimeout(() => this.cd.detectChanges(), 0);
  }

  protected setCorrectHeightOnRowsRetrieved(): void {
    // Watch for filteredAllocations$ signal changes via an effect-like subscription
    // using toObservable from @angular/core/rxjs-interop would work here too
    const checkInterval = setInterval(() => {
      const allocations = this.allocationsStore.filteredAllocations$();
      if (allocations !== null) {
        clearInterval(checkInterval);
        setTimeout(() => {
          if (!this.allocationDetailElem?.nativeElement) return;
          const actualHeight = this.allocationDetailElem.nativeElement.offsetHeight;
          const detailRowNode = this.params?.node;
          detailRowNode?.setRowHeight(actualHeight);
          this.params?.api.onRowHeightChanged();
          this.cd.detectChanges();
        }, 0);
      }
    }, 50);
  }

  protected hideAllOtherDetails(): void {
    this.params?.api.forEachNode((rowNode: IRowNode<any>) => {
      if (rowNode.master && !rowNode.group && rowNode.id !== this.params?.node.parent?.id) {
        rowNode.setExpanded(false);
      }
      if (rowNode.id === this.params?.node.parent?.id) {
        rowNode.setExpanded(true);
      }
    });
    setTimeout(() => this.cd.detectChanges(), 0);
  }

  protected handleAllocationsVerticalResize(event: SizeChangedEvent): void {
    const newHeight = event.height;
    if (newHeight && newHeight > 0) {
      this.heightBeforeExpand = null;
      this.params?.node.setRowHeight(newHeight);
      this.params?.api.onRowHeightChanged();
    }
  }

  protected handleBottomEdgeDoubleClick(): void {
    const elem = this.allocationDetailElem?.nativeElement;
    if (!elem || !this.innerGridApi) return;

    if (this.heightBeforeExpand === null) {
      this.heightBeforeExpand = elem.offsetHeight;
      const contentHeight = calcFullGridHeight(elem, this.innerGridApi);
      elem.style.height = `${contentHeight}px`;
      this.params?.node.setRowHeight(contentHeight);
      this.params?.api.onRowHeightChanged();
      this.cd.detectChanges();
    } else {
      const restore = this.heightBeforeExpand;
      this.heightBeforeExpand = null;
      elem.style.height = `${restore}px`;
      this.params?.node.setRowHeight(restore);
      this.params?.api.onRowHeightChanged();
      this.cd.detectChanges();
    }
  }
}
