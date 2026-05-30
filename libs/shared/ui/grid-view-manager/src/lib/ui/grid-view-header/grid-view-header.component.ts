import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  takeUntilDestroyed,
  toObservable,
  toSignal,
} from '@angular/core/rxjs-interop';
import { ColDef, GridState } from '@ag-grid-community/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ButtonModule } from 'primeng/button';
import { ButtonGroupModule } from 'primeng/buttongroup';
import { TooltipModule } from 'primeng/tooltip';
import { HdsIconComponent } from '@fmr-pr000264/hds-core-icons';
import { Subject, filter, switchMap, take, takeUntil } from 'rxjs';
import {
  EqtCommonGridComponent,
  Icon,
  getCurrentSystemDateTimeWithZone,
} from '@fmr-pr000539/eqt-common-grid';
import { GridViewModel } from '../../models/grid-view.model';
import { GRID_VIEW_CONSTRAINTS } from '../../models/grid-view-state.model';
import {
  CustomGridState,
  getEmptyGridState,
} from '../../data-access/grid-state/grid-state.utils';
import { GridViewManagerDirective } from '../../feature/grid-view-manager.directive';
import { GridViewHeaderFacadeService } from '../../facade/grid-view-header-facade.service';
import { GridViewManagerStoreModule } from '../../state/grid-view-manager-store.module';
import { GridEditSessionService } from '../../services/grid-edit-session.service';
import { ViewDialogComponent } from '../view-dialog/view-dialog.component';
import { ViewDropdownComponent } from '../view-dropdown/view-dropdown.component';
import { HEADER_ICONS } from './grid-view-icons';

type DialogInitialData = Partial<GridViewModel> & { name?: string };

/* eslint-disable @angular-eslint/component-selector */
@Component({
  selector: 'grid-view-header',
  standalone: true,
  hostDirectives: [
    {
      directive: GridViewManagerDirective,
      inputs: ['gridId', 'appName'],
    },
  ],
  imports: [
    CommonModule,
    ButtonModule,
    ButtonGroupModule,
    TooltipModule,
    MatProgressSpinnerModule,
    ViewDropdownComponent,
    ViewDialogComponent,
    HdsIconComponent,
    GridViewManagerStoreModule,
  ],
  providers: [GridViewHeaderFacadeService],
  templateUrl: './grid-view-header.component.html',
  styleUrls: ['./grid-view-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class GridViewHeaderComponent {
  public readonly gridId = input<string>('');
  public readonly appName = input<string | undefined>(undefined);
  public readonly defaultViews = input<GridViewModel[]>([]);
  public readonly hideIcons = input<Icon[]>([]);
  public readonly lastUpdatedTimestamp = input<string>(
    getCurrentSystemDateTimeWithZone(),
  );

  public readonly icons = HEADER_ICONS;
  public readonly allIcons = Icon;

  private readonly destroyRef = inject(DestroyRef);
  private readonly facade = inject(GridViewHeaderFacadeService);
  private readonly managerDirective = inject(GridViewManagerDirective);
  private readonly editSession = inject(GridEditSessionService, {
    optional: true,
  });
  private readonly parentGrid = inject(EqtCommonGridComponent, {
    optional: true,
    skipSelf: true,
  });

  public readonly grid = signal<EqtCommonGridComponent | undefined>(
    this.parentGrid ?? undefined,
  );

  public readonly resolvedGridId = computed(
    () => this.gridId() || this.managerDirective.resolvedId,
  );
  public readonly resolvedAppName = computed(
    () =>
      this.appName() ??
      this.managerDirective.appName ??
      this.grid()?.appName ??
      '',
  );

  private readonly initializedFor = signal<string | null>(null);
  private readonly initialized$ = toObservable(this.initializedFor).pipe(
    filter((id): id is string => id !== null),
    take(1),
  );

  public readonly views = toSignal(
    this.initialized$.pipe(switchMap(() => this.facade.views$)),
    { initialValue: [] as GridViewModel[] },
  );
  public readonly activeView = toSignal(
    this.initialized$.pipe(switchMap(() => this.facade.activeView$)),
    { initialValue: null as GridViewModel | null },
  );
  public readonly isSaving = toSignal(
    this.initialized$.pipe(switchMap(() => this.facade.isSaving$)),
    { initialValue: false },
  );
  public readonly hasStateChanged = toSignal(
    this.initialized$.pipe(switchMap(() => this.facade.hasStateChanged$)),
    { initialValue: false },
  );
  public readonly hasUnsavedChanges = toSignal(
    this.initialized$.pipe(switchMap(() => this.facade.hasUnsavedChanges$)),
    { initialValue: false },
  );
  public readonly canSave = toSignal(
    this.initialized$.pipe(switchMap(() => this.facade.canSave$)),
    { initialValue: false },
  );

  private readonly gridInteractionVersion = signal(0);

  public readonly isFiltersActive = computed(() => {
    this.gridInteractionVersion();
    return this.grid()?.isFiltersActive() ?? false;
  });
  public readonly isSortingApplied = computed(() => {
    this.gridInteractionVersion();
    return this.grid()?.isSortingAppliedInGrid ?? false;
  });
  public readonly clearFiltersIcon = computed(() =>
    this.isFiltersActive()
      ? this.icons.filterFilled
      : this.icons.filterUnfilled,
  );
  public readonly removeSortIcon = computed(() =>
    this.isSortingApplied() ? this.icons.sortOrdered : this.icons.sortUnordered,
  );
  public readonly clearFiltersDisabled = computed(
    () => !this.isFiltersActive(),
  );
  public readonly removeSortDisabled = computed(() => !this.isSortingApplied());
  public readonly showExpandAll = computed(() => {
    this.gridInteractionVersion();
    return this.grid()?.showExpandAll() ?? true;
  });
  public readonly isDefaultView = computed(() => {
    const av = this.activeView();
    return av?.isDefault === true || av?.isSystemDefault === true;
  });
  public readonly isDraftFromPreset = computed(() => {
    const av = this.activeView();
    if (!av?.isDraft) return false;
    return this.views().some(
      (v) =>
        v.id === av.draftSourceViewId &&
        (v.isSystemDefault === true || v.isDefault),
    );
  });
  public readonly isDraft = computed(() => this.activeView()?.isDraft === true);

  public dialogVisible = false;
  public dialogInitialData: DialogInitialData = {};
  private dialogGridState: CustomGridState | null = null;

  private readonly gridEventsTeardown = new Subject<void>();
  private gridApiCleanups: Array<() => void> = [];

  public constructor() {
    effect(() => {
      const id = this.resolvedGridId();
      if (id && this.initializedFor() !== id) {
        this.facade.init(id);
        this.initializedFor.set(id);
        this.subscribeFacadeSideEffects();
      }
    });

    effect(() => {
      const grid = this.grid();
      this.teardownGridEvents();
      if (grid) {
        this.bindGridEvents(grid);
      }
    });

    this.destroyRef.onDestroy(() => this.teardownGridEvents());
  }

  private subscribeFacadeSideEffects(): void {
    this.facade.saveAsNewRequired$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ draftView, suggestedName }) => {
        this.dialogGridState = draftView.gridState as CustomGridState;
        this.dialogInitialData = { ...draftView, name: suggestedName };
        this.dialogVisible = true;
      });
  }

  private teardownGridEvents(): void {
    this.gridApiCleanups.forEach((fn) => fn());
    this.gridApiCleanups = [];
    this.gridEventsTeardown.next();
  }

  private bindGridEvents(grid: EqtCommonGridComponent): void {
    grid.stateChanged
      .pipe(takeUntil(this.gridEventsTeardown))
      .subscribe((state: GridState) => this.onGridStateChanged(state));

    grid.sortChanged
      .pipe(takeUntil(this.gridEventsTeardown))
      .subscribe(() => this.bumpInteraction());

    grid.gridReadyEvent
      .pipe(takeUntil(this.gridEventsTeardown))
      .subscribe((event) => {
        this.bumpInteraction();
        const bump = (): void => this.bumpInteraction();
        event.api.addEventListener('filterChanged', bump);
        event.api.addEventListener('sortChanged', bump);
        this.gridApiCleanups.push(() => {
          event.api.removeEventListener('filterChanged', bump);
          event.api.removeEventListener('sortChanged', bump);
        });
      });
  }

  private bumpInteraction(): void {
    this.gridInteractionVersion.update((v) => v + 1);
  }

  private onGridStateChanged(gridState: GridState): void {
    this.bumpInteraction();
    const grid = this.grid();
    if (!grid) return;

    const validColIds = new Set<string>(
      grid.gridApi.getColumns()?.map((c) => c.getColId()) ?? [],
    );

    const stateWithExpand: CustomGridState = {
      ...(gridState as CustomGridState),
      expandAll: !grid.showExpandAll(),
    };

    if (this.editSession?.isSuppressing() === true) {
      this.editSession.commitBaseline(
        stateWithExpand as CustomGridState,
        validColIds,
      );
      return;
    }

    if (this.editSession && !this.editSession.isUserChange()) return;

    this.facade.notifyGridStateChanged(
      this.resolvedGridId(),
      stateWithExpand as unknown as GridState,
      this.getColumnDefs(),
      validColIds,
      this.resolvedAppName(),
    );
  }

  private getColumnDefs(): Array<{ colId: string }> {
    const grid = this.grid();
    if (!grid) return [];
    return grid.columnDefs
      .filter((col: ColDef) => col.colId)
      .map((col: ColDef) => ({ colId: col.colId as string }));
  }

  public setGrid(value: EqtCommonGridComponent | undefined): void {
    this.grid.set(value);
  }

  public resetGrid(): void {
    this.grid()?.resetGrid();
  }

  public resetView(): void {
    const av = this.activeView();
    if (!av) return;
    if (av.isDraft) {
      this.facade.discardDraft(
        this.resolvedGridId(),
        av.draftSourceViewId,
        this.getColumnDefs(),
        this.resolvedAppName(),
      );
      return;
    }
    this.managerDirective.resetToActiveView();
  }

  public saveView(): void {
    const av = this.activeView();
    if (!av || this.isDraftFromPreset() || this.isDefaultView()) return;
    this.facade.saveView(
      this.resolvedGridId(),
      av,
      this.grid()?.gridApi.getState() ?? {},
      !this.showExpandAll(),
      this.getColumnDefs(),
      this.resolvedAppName(),
    );
  }

  public exportData(): void {
    this.grid()?.exportData();
  }

  public expandAll(): void {
    try {
      this.grid()?.expandAll();
      this.bumpInteraction();
    } catch (error) {
      console.error('Failed to dispatch expandAll action:', error);
    }
  }

  public collapseAll(): void {
    try {
      this.grid()?.collapseAll();
      this.bumpInteraction();
    } catch (error) {
      console.error('Failed to dispatch collapseAll action:', error);
    }
  }

  public refreshGridData(): void {
    this.grid()?.refreshGridData();
  }

  public clearAllFilters(): void {
    this.grid()?.clearAllFilters();
  }

  public removeAllSorting(): void {
    this.grid()?.removeAllSorting();
  }

  public onSelectView(viewName: string): void {
    this.facade.selectView(
      this.resolvedGridId(),
      this.views(),
      viewName,
      this.resolvedAppName(),
    );
  }

  public onEditView(data: { oldName: string; newName: string }): void {
    this.facade.editView(
      this.resolvedGridId(),
      this.views(),
      data,
      this.getColumnDefs(),
      this.resolvedAppName(),
    );
  }

  public onDeleteView(view: GridViewModel): void {
    this.facade.deleteView(
      this.resolvedGridId(),
      view.id,
      this.getColumnDefs(),
      this.resolvedAppName(),
    );
  }

  public onCreateView(view: GridViewModel): void {
    this.facade.createView(
      this.resolvedGridId(),
      view,
      this.getColumnDefs(),
      this.resolvedAppName(),
    );
  }

  public createNewFrom(): void {
    const av = this.activeView();
    if (!av) return;

    this.dialogGridState = av.isDraft
      ? (av.gridState as CustomGridState)
      : ((this.grid()?.gridApi.getState() as CustomGridState | undefined) ??
        getEmptyGridState());

    const baseName = av.isDraft
      ? av.name
          .replace(GRID_VIEW_CONSTRAINTS.DRAFT_SUFFIX, '')
          .replace(GRID_VIEW_CONSTRAINTS.DRAFT_PREFIX, '')
      : av.name;
    const newName = this.facade.generateUniqueName(this.views(), baseName);
    this.dialogInitialData = { ...av, name: newName };
    this.dialogVisible = true;
  }

  public onHeaderDialogSave(result: {
    mode: 'create' | 'edit';
    name: string;
  }): void {
    this.facade.createViewFromDialog(
      this.resolvedGridId(),
      result,
      this.dialogGridState,
      this.getColumnDefs(),
      this.resolvedAppName(),
    );
    this.dialogGridState = null;
  }
}
