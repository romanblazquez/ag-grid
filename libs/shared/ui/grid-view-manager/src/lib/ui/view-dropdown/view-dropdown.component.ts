import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { ViewDialogComponent } from '../view-dialog/view-dialog.component';
import { HdsIconComponent } from '../shared/hds-icon/hds-icon.component';
import { TooltipModule } from 'primeng/tooltip';
import { ConnectionPositionPair, OverlayModule } from '@angular/cdk/overlay';
import { GridViewModel } from '../../models/grid-view.model';
import { GridState } from 'ag-grid-community';
import { v4 as uuidv4 } from 'uuid';

/* eslint-disable @angular-eslint/component-selector */
@Component({
  selector: 'view-dropdown',
  standalone: true,
  imports: [
    CommonModule,
    OverlayModule,
    TooltipModule,
    HdsIconComponent,
    ViewDialogComponent,
    ConfirmDialog,
  ],
  providers: [ConfirmationService],
  templateUrl: './view-dropdown.component.html',
  styleUrls: ['./view-dropdown.component.scss'],
})
export class ViewDropdownComponent {
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  private static readonly OVERLAY_VERTICAL_OFFSET = 8;

  public constructor(
    private readonly confirmationService: ConfirmationService,
  ) {}

  public activeMenuView: string | null = null;
  public menuPosition: 'left' | 'right' = 'right';

  // Dialog state
  public dialogVisible = false;
  public dialogEditMode = false;
  public dialogInitialData: Partial<Record<string, unknown>> & {
    name?: string;
  } = {};
  private _pendingView?: GridViewModel;

  // Icon name constants (plain strings, no proprietary type)
  public readonly chevronDownIcon = 'hds-chevron-down';
  public readonly lockIcon = 'hds-locked-filled';
  public readonly copyIcon = 'hds-copy';
  public readonly editIcon = 'hds-edit';
  public readonly deleteIcon = 'hds-delete';
  public readonly moreIcon = 'hds-ellipsis-horizontal';
  public readonly addIcon = 'hds-add-new-item';

  public openMenu(view: { name: string }, event: MouseEvent): void {
    this.activeMenuView = view.name;
    this.calculateMenuPosition(event);
  }

  private calculateMenuPosition(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const rect = target.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const menuWidth = 220;
    const spaceOnRight = viewportWidth - rect.right;
    this.menuPosition = spaceOnRight < menuWidth ? 'left' : 'right';
  }

  public closeMenu(): void {
    this.activeMenuView = null;
  }

  private generateUniqueName(baseName: string): string {
    const existingNames = this.views.map((v) => v.name);

    if (!existingNames.includes(baseName)) {
      return baseName;
    }

    let counter = 2;
    let newName = `${baseName} (${counter})`;

    while (existingNames.includes(newName)) {
      counter++;
      newName = `${baseName} (${counter})`;
    }

    return newName;
  }

  @Input() public currentViewName = 'Default View';

  private _views?: GridViewModel[];
  private readonly _defaultViews?: GridViewModel[];
  public panelOpen = false;
  public readonly overlayPositions: ConnectionPositionPair[] = [
    new ConnectionPositionPair(
      { originX: 'start', originY: 'bottom' },
      { overlayX: 'start', overlayY: 'top' },
      0,
      0,
    ),
    new ConnectionPositionPair(
      { originX: 'end', originY: 'top' },
      { overlayX: 'end', overlayY: 'bottom' },
      0,
      ViewDropdownComponent.OVERLAY_VERTICAL_OFFSET,
    ),
  ];

  public get filteredViews(): GridViewModel[] {
    // Exclude drafts from the dropdown list
    const nonDraftViews = this.views.filter((v) => !v.isDraft);
    if (nonDraftViews.length === 1) {
      return nonDraftViews;
    }
    return nonDraftViews.filter((v) => !v.isDefault);
  }

  @Input()
  public set views(val: GridViewModel[] | undefined) {
    this._views = val?.length ? val : undefined;
  }
  public get views(): GridViewModel[] {
    return this._views ?? [];
  }

  @Input()
  public set defaultViews(val: GridViewModel[] | undefined) {
    this._views = val?.length ? val : undefined;
  }
  public get defaultViews(): GridViewModel[] {
    return this._defaultViews ?? [];
  }

  @Output() public selectView = new EventEmitter<string>();
  @Output() public createView = new EventEmitter<GridViewModel>();
  @Output() public editView = new EventEmitter<{
    oldName: string;
    newName: string;
  }>();
  @Output() public deleteView = new EventEmitter<GridViewModel>();

  public select(view: string): void {
    this.currentViewName = view;
    this.selectView.emit(view);
  }

  public createNewView(): void {
    this.closePanel();
    this._pendingView = undefined;
    this.dialogEditMode = false;
    this.dialogInitialData = {};
    this.dialogVisible = true;
  }

  public editExistingView(viewId: string): void {
    this.closePanel();
    const view = this.views.find((v) => v.id === viewId);
    if (!view) return;
    this._pendingView = view;
    this.dialogEditMode = true;
    this.dialogInitialData = { ...view };
    this.dialogVisible = true;
    this.closeMenu();
  }

  public copyExistingView(viewId: string): void {
    this.closePanel();
    const view = this.views.find((v) => v.id === viewId);
    if (!view) return;

    const baseName = `${view.name} - copy`;
    const newName = this.generateUniqueName(baseName);

    this._pendingView = view;
    this.dialogEditMode = false;
    this.dialogInitialData = { ...view, name: newName };
    this.dialogVisible = true;
    this.closeMenu();
  }

  public deleteExistingView(data: GridViewModel): void {
    this.closePanel();
    const view = this.views.find((v) => v.id === data.id);
    if (!view) return;
    this.closeMenu();

    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${view.name}"?`,
      header: 'Delete View',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Delete', severity: 'danger' },
      rejectButtonProps: {
        label: 'Cancel',
        severity: 'secondary',
        outlined: true,
      },
      accept: () => {
        this.deleteView.emit(view);
      },
    });
  }

  public onDialogSave(result: { mode: 'create' | 'edit'; name: string }): void {
    if (result.mode === 'edit' && this._pendingView) {
      this.editView.emit({
        oldName: this._pendingView.name,
        newName: result.name,
      });
    } else if (result.mode === 'create') {
      const gridState = this._pendingView
        ? this._pendingView.gridState
        : ({} as GridState);
      this.createView.emit({
        id: uuidv4(),
        name: result.name,
        isDefault: false,
        isSelected: true,
        isSystemDefault: false,
        gridState,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    this._pendingView = undefined;
  }

  public onDialogCancel(): void {
    this._pendingView = undefined;
  }

  public togglePanel(): void {
    this.panelOpen = !this.panelOpen;
  }

  public closePanel(): void {
    this.panelOpen = false;
    this.closeMenu();
  }

  public selectAndClose(viewName: string): void {
    this.select(viewName);
    this.closePanel();
  }

  public createAndClose(): void {
    this.createNewView();
    this.closePanel();
  }
}
