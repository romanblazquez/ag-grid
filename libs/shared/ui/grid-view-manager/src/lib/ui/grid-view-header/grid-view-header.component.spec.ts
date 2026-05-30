import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { EventEmitter, signal } from '@angular/core';

import { GridViewHeaderComponent } from './grid-view-header.component';
import { HEADER_ICONS } from './grid-view-icons';
import { CustomGridState } from '../../data-access/grid-state/grid-state.utils';
import { GridViewModel } from '../../models/grid-view.model';
import { GridViewManagerDirective } from '../../feature/grid-view-manager.directive';
import { GridEditSessionService } from '../../services/grid-edit-session.service';
import { GridViewHeaderFacadeService } from '../../facade/grid-view-header-facade.service';
import { GridDefaultsConfigService } from '../../data-access/services/grid-defaults-config.service';
import { EqtCommonGridComponent } from '@fmr-pr000539/eqt-common-grid';
import { IPrefV2Service } from '@fmr-pr000264/ames-ipref-v2-service';
import { RuntimeConfigExt } from '@fmr-pr000539/eqt-ames-conf-preset';

jest.mock('@fmr-pr000539/eqt-common-grid', () => ({
  ...jest.requireActual('@fmr-pr000539/eqt-common-grid'),
  getCurrentSystemDateTimeWithZone: jest.fn(() => '2024-01-01T00:00:00Z'),
}));

describe('GridViewHeaderComponent', () => {
  let component: GridViewHeaderComponent;
  let fixture: ComponentFixture<GridViewHeaderComponent>;
  let mockGridComponent: Partial<EqtCommonGridComponent>;
  let mockManager: Partial<GridViewManagerDirective>;
  let mockFacade: Partial<GridViewHeaderFacadeService>;
  let mockEditSession: Partial<GridEditSessionService>;
  let saveAsNewRequired$: Subject<{
    draftView: GridViewModel;
    suggestedName: string;
  }>;

  const mockGridState: CustomGridState = {
    filter: { filterModel: {} },
    sort: { sortModel: [] },
    columnOrder: { orderedColIds: [] },
  };

  const mockViews: GridViewModel[] = [
    {
      id: 'view-1',
      name: 'Default View',
      gridState: mockGridState,
      isDefault: true,
      isSelected: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'view-2',
      name: 'Custom View',
      gridState: mockGridState,
      isDefault: false,
      isSelected: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const initialState = {
    gridViewManager: {
      gridViews: {
        'test-grid-id': {
          views: mockViews,
          selectedViewId: 'view-1',
          defaultViewId: 'view-1',
          loading: false,
          error: null,
        },
      },
    },
  };

  /** Create the component, set inputs, attach mock grid, and trigger init effects. */
  function createComponent(
    inputs: { gridId?: string; appName?: string } = { gridId: 'test-grid-id' },
  ): void {
    fixture = TestBed.createComponent(GridViewHeaderComponent);
    component = fixture.componentInstance;
    if (inputs.gridId !== undefined) {
      fixture.componentRef.setInput('gridId', inputs.gridId);
    }
    if (inputs.appName !== undefined) {
      fixture.componentRef.setInput('appName', inputs.appName);
    }
    component.setGrid(mockGridComponent as EqtCommonGridComponent);
    (component as unknown as { managerDirective: unknown }).managerDirective =
      mockManager;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    saveAsNewRequired$ = new Subject();

    mockGridComponent = {
      gridId: 'test-grid-id',
      gridApi: {
        getState: jest.fn().mockReturnValue(mockGridState),
        getColumns: jest
          .fn()
          .mockReturnValue([
            { getColId: () => 'col1' },
            { getColId: () => 'col2' },
          ]),
        forEachNode: jest.fn(),
      } as unknown as EqtCommonGridComponent['gridApi'],
      columnDefs: [
        { colId: 'col1', field: 'field1' },
        { colId: 'col2', field: 'field2' },
      ],
      appName: 'test-app',
      stateChanged: new EventEmitter(),
      sortChanged: new EventEmitter(),
      gridReadyEvent: new EventEmitter(),
      isFiltersActive: jest.fn().mockReturnValue(false),
      isSortingAppliedInGrid: false,
      showExpandAll: signal(true),
      exportData: jest.fn(),
      expandAll: jest.fn(),
      collapseAll: jest.fn(),
      refreshGridData: jest.fn(),
      clearAllFilters: jest.fn(),
      removeAllSorting: jest.fn(),
      resetGrid: jest.fn(),
    } as Partial<EqtCommonGridComponent>;

    mockManager = {
      resetToActiveView: jest.fn(),
    };

    mockEditSession = {
      isSuppressing: jest.fn().mockReturnValue(false),
      isUserChange: jest.fn().mockReturnValue(true),
      commitBaseline: jest.fn(),
      suppressChanges: jest.fn().mockImplementation((fn: () => void) => fn()),
    };

    mockFacade = {
      init: jest.fn(),
      notifyGridStateChanged: jest.fn(),
      selectView: jest.fn(),
      editView: jest.fn(),
      deleteView: jest.fn(),
      createView: jest.fn(),
      saveView: jest.fn(),
      discardDraft: jest.fn(),
      createViewFromDialog: jest.fn(),
      generateUniqueName: jest.fn().mockReturnValue('Custom View (1)'),
      views$: of(mockViews),
      activeView$: of(mockViews[0]),
      isSaving$: new BehaviorSubject<boolean>(false).asObservable(),
      hasStateChanged$: new BehaviorSubject<boolean>(false).asObservable(),
      hasUnsavedChanges$: new BehaviorSubject<boolean>(false).asObservable(),
      canSave$: new BehaviorSubject<boolean>(false).asObservable(),
      saveAsNewRequired$: saveAsNewRequired$.asObservable(),
    } as unknown as Partial<GridViewHeaderFacadeService>;

    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        StoreModule.forRoot({}),
        EffectsModule.forRoot([]),
        GridViewHeaderComponent,
      ],
      providers: [
        provideMockStore({ initialState }),
        provideMockActions(() => new Subject()),
        {
          provide: IPrefV2Service,
          useValue: {
            getPrefValue: jest.fn().mockReturnValue(of(null)),
            savePref: jest.fn().mockReturnValue(of({})),
            deleteAllPrefs: jest.fn().mockReturnValue(of({})),
          },
        },
        {
          provide: RuntimeConfigExt,
          useValue: { logicalEnvironment: 'DEV' },
        },
        {
          provide: GridDefaultsConfigService,
          useValue: {
            getAllDefaultViewsForApp: jest.fn().mockReturnValue(of([])),
            getDefaultViewForApp: jest.fn().mockReturnValue(of(null)),
            getSharedViewsForApp: jest.fn().mockReturnValue(of([])),
          },
        },
      ],
    })
      .overrideComponent(GridViewHeaderComponent, {
        set: {
          providers: [
            { provide: GridViewHeaderFacadeService, useValue: mockFacade },
            { provide: EqtCommonGridComponent, useValue: mockGridComponent },
            { provide: GridEditSessionService, useValue: mockEditSession },
          ],
        },
      })
      .compileComponents();

    TestBed.inject(MockStore);
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('initialization', () => {
    it('should create the component', () => {
      createComponent();
      expect(component).toBeTruthy();
    });

    it('should initialize facade with resolved gridId', () => {
      createComponent({ gridId: 'test-grid-id' });
      expect(mockFacade.init).toHaveBeenCalledWith('test-grid-id');
    });

    it('should expose icons map', () => {
      createComponent();
      expect(component.icons).toBe(HEADER_ICONS);
      expect(component.icons.export).toBe('hds-download');
      expect(component.icons.expandAll).toBe('hds-chevron-down');
      expect(component.icons.collapseAll).toBe('hds-chevron-up');
      expect(component.icons.refresh).toBe('hds-refresh-data');
      expect(component.icons.history).toBe('hds-history');
      expect(component.icons.save).toBe('hds-save');
      expect(component.icons.addNew).toBe('hds-add-new-item');
      expect(component.icons.filterFilled).toBe('hds-filter-filled');
      expect(component.icons.filterUnfilled).toBe('hds-filter');
      expect(component.icons.sortOrdered).toBe('hds-list-ordered');
      expect(component.icons.sortUnordered).toBe('hds-list-unordered');
    });

    it('should expose views and activeView signals from facade', () => {
      createComponent();
      expect(component.views()).toEqual(mockViews);
      expect(component.activeView()).toEqual(mockViews[0]);
    });
  });

  describe('grid signal', () => {
    it('should set grid via setGrid()', () => {
      createComponent();
      const newGrid = { ...mockGridComponent } as EqtCommonGridComponent;
      component.setGrid(newGrid);
      expect(component.grid()).toBe(newGrid);
    });

    it('should allow clearing the grid', () => {
      createComponent();
      component.setGrid(undefined);
      expect(component.grid()).toBeUndefined();
    });
  });

  describe('grid action delegation', () => {
    beforeEach(() => createComponent());

    it('exportData() delegates to grid', () => {
      component.exportData();
      expect(mockGridComponent.exportData).toHaveBeenCalled();
    });

    it('expandAll() delegates to grid', () => {
      component.expandAll();
      expect(mockGridComponent.expandAll).toHaveBeenCalled();
    });

    it('collapseAll() delegates to grid', () => {
      component.collapseAll();
      expect(mockGridComponent.collapseAll).toHaveBeenCalled();
    });

    it('refreshGridData() delegates to grid', () => {
      component.refreshGridData();
      expect(mockGridComponent.refreshGridData).toHaveBeenCalled();
    });

    it('clearAllFilters() delegates to grid', () => {
      component.clearAllFilters();
      expect(mockGridComponent.clearAllFilters).toHaveBeenCalled();
    });

    it('removeAllSorting() delegates to grid', () => {
      component.removeAllSorting();
      expect(mockGridComponent.removeAllSorting).toHaveBeenCalled();
    });

    it('resetGrid() delegates to grid', () => {
      component.resetGrid();
      expect(mockGridComponent.resetGrid).toHaveBeenCalled();
    });

    it('expandAll() swallows errors from grid', () => {
      (mockGridComponent.expandAll as jest.Mock).mockImplementation(() => {
        throw new Error('boom');
      });
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      expect(() => component.expandAll()).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('collapseAll() swallows errors from grid', () => {
      (mockGridComponent.collapseAll as jest.Mock).mockImplementation(() => {
        throw new Error('boom');
      });
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      expect(() => component.collapseAll()).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('grid actions are no-ops when grid is undefined', () => {
      component.setGrid(undefined);
      expect(() => {
        component.exportData();
        component.refreshGridData();
        component.clearAllFilters();
        component.removeAllSorting();
        component.resetGrid();
      }).not.toThrow();
    });
  });

  describe('view selection / lifecycle', () => {
    beforeEach(() => createComponent({ gridId: 'test-grid-id' }));

    it('onSelectView delegates to facade', () => {
      component.onSelectView('Custom View');
      expect(mockFacade.selectView).toHaveBeenCalledWith(
        'test-grid-id',
        mockViews,
        'Custom View',
        expect.any(String),
      );
    });

    it('onEditView delegates to facade', () => {
      component.onEditView({ oldName: 'A', newName: 'B' });
      expect(mockFacade.editView).toHaveBeenCalled();
    });

    it('onDeleteView delegates to facade', () => {
      component.onDeleteView(mockViews[1]);
      expect(mockFacade.deleteView).toHaveBeenCalledWith(
        'test-grid-id',
        'view-2',
        expect.any(Array),
        expect.any(String),
      );
    });

    it('onCreateView delegates to facade', () => {
      component.onCreateView(mockViews[1]);
      expect(mockFacade.createView).toHaveBeenCalled();
    });

    it('saveView delegates to facade for non-default view', () => {
      const customView: GridViewModel = {
        ...mockViews[1],
        isDefault: false,
        isSystemDefault: false,
      };
      mockFacade.activeView$ = of(customView);
      mockFacade.views$ = of([customView]);
      createComponent({ gridId: 'test-grid-id' });

      component.saveView();
      expect(mockFacade.saveView).toHaveBeenCalled();
    });

    it('saveView is a no-op for default view', () => {
      component.saveView();
      expect(mockFacade.saveView).not.toHaveBeenCalled();
    });

    it('resetView for non-draft delegates to manager', () => {
      component.resetView();
      expect(mockManager.resetToActiveView).toHaveBeenCalled();
    });

    it('resetView for draft delegates to facade.discardDraft', () => {
      const draft: GridViewModel = {
        ...mockViews[0],
        isDraft: true,
        draftSourceViewId: 'src',
      };
      mockFacade.activeView$ = of(draft);
      createComponent({ gridId: 'test-grid-id' });

      component.resetView();
      expect(mockFacade.discardDraft).toHaveBeenCalledWith(
        'test-grid-id',
        'src',
        expect.any(Array),
        expect.any(String),
      );
    });
  });

  describe('createNewFrom / dialog flow', () => {
    beforeEach(() => createComponent({ gridId: 'test-grid-id' }));

    it('createNewFrom opens dialog with suggested unique name', () => {
      component.createNewFrom();
      expect(component.dialogVisible).toBe(true);
      expect(component.dialogInitialData.name).toBe('Custom View (1)');
    });

    it('saveAsNewRequired$ from facade opens the dialog', () => {
      const draftView: GridViewModel = {
        ...mockViews[0],
        gridState: mockGridState,
      };
      saveAsNewRequired$.next({ draftView, suggestedName: 'Suggested' });
      expect(component.dialogVisible).toBe(true);
      expect(component.dialogInitialData.name).toBe('Suggested');
    });

    it('onHeaderDialogSave delegates to facade', () => {
      component.createNewFrom();
      component.onHeaderDialogSave({ mode: 'create', name: 'New' });
      expect(mockFacade.createViewFromDialog).toHaveBeenCalled();
    });
  });

  describe('computed visual state', () => {
    it('clearFiltersIcon reflects isFiltersActive', () => {
      createComponent();
      expect(component.clearFiltersIcon()).toBe(HEADER_ICONS.filterUnfilled);

      (mockGridComponent.isFiltersActive as jest.Mock).mockReturnValue(true);
      // Trigger interaction bump via stateChanged
      (mockGridComponent.stateChanged as EventEmitter<unknown>).emit(
        mockGridState,
      );
      expect(component.clearFiltersIcon()).toBe(HEADER_ICONS.filterFilled);
    });

    it('removeSortIcon reflects isSortingAppliedInGrid', () => {
      createComponent();
      expect(component.removeSortIcon()).toBe(HEADER_ICONS.sortUnordered);

      (
        mockGridComponent as { isSortingAppliedInGrid: boolean }
      ).isSortingAppliedInGrid = true;
      (mockGridComponent.sortChanged as EventEmitter<unknown>).emit({});
      expect(component.removeSortIcon()).toBe(HEADER_ICONS.sortOrdered);
    });

    it('isDefaultView returns true when activeView is default', () => {
      createComponent();
      expect(component.isDefaultView()).toBe(true);
    });

    it('showExpandAll reflects grid signal — true when groups are collapsed', () => {
      createComponent();
      (
        mockGridComponent.showExpandAll as ReturnType<typeof signal<boolean>>
      ).set(true);
      (mockGridComponent.stateChanged as EventEmitter<unknown>).emit(
        mockGridState,
      );
      expect(component.showExpandAll()).toBe(true);
    });

    it('showExpandAll reflects grid signal — false when groups are expanded', () => {
      createComponent();
      (
        mockGridComponent.showExpandAll as ReturnType<typeof signal<boolean>>
      ).set(false);
      (mockGridComponent.stateChanged as EventEmitter<unknown>).emit(
        mockGridState,
      );
      expect(component.showExpandAll()).toBe(false);
    });

    it('expandAll() calls grid expandAll and bumps interaction so showExpandAll updates', () => {
      createComponent();
      (
        mockGridComponent.showExpandAll as ReturnType<typeof signal<boolean>>
      ).set(true);
      component.expandAll();
      expect(mockGridComponent.expandAll).toHaveBeenCalled();
    });

    it('collapseAll() calls grid collapseAll and bumps interaction so showExpandAll updates', () => {
      createComponent();
      (
        mockGridComponent.showExpandAll as ReturnType<typeof signal<boolean>>
      ).set(false);
      component.collapseAll();
      expect(mockGridComponent.collapseAll).toHaveBeenCalled();
    });
  });

  describe('expandAll persistence in auto-save', () => {
    it('onGridStateChanged injects expandAll=true when grid is expanded (showExpandAll=false)', () => {
      createComponent();
      (
        mockGridComponent.showExpandAll as ReturnType<typeof signal<boolean>>
      ).set(false);
      (mockGridComponent.stateChanged as EventEmitter<unknown>).emit(
        mockGridState,
      );
      expect(mockFacade.notifyGridStateChanged).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ expandAll: true }),
        expect.any(Array),
        expect.any(Set),
        expect.any(String),
      );
    });

    it('onGridStateChanged injects expandAll=false when grid is collapsed (showExpandAll=true)', () => {
      createComponent();
      (
        mockGridComponent.showExpandAll as ReturnType<typeof signal<boolean>>
      ).set(true);
      (mockGridComponent.stateChanged as EventEmitter<unknown>).emit(
        mockGridState,
      );
      expect(mockFacade.notifyGridStateChanged).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ expandAll: false }),
        expect.any(Array),
        expect.any(Set),
        expect.any(String),
      );
    });
  });

  describe('bindGridEvents subscription lifecycle', () => {
    it('stateChanged on the bound grid reaches the facade', () => {
      createComponent();
      (mockGridComponent.stateChanged as EventEmitter<unknown>).emit(
        mockGridState,
      );
      expect(mockFacade.notifyGridStateChanged).toHaveBeenCalled();
    });

    it('swapping to a new grid tears down old subscriptions and binds new ones', () => {
      createComponent();
      const newGrid: Partial<EqtCommonGridComponent> = {
        ...mockGridComponent,
        stateChanged: new EventEmitter(),
        sortChanged: new EventEmitter(),
        gridReadyEvent: new EventEmitter(),
      };
      component.setGrid(newGrid as EqtCommonGridComponent);
      fixture.detectChanges();

      (mockGridComponent.stateChanged as EventEmitter<unknown>).emit(
        mockGridState,
      );
      expect(mockFacade.notifyGridStateChanged).not.toHaveBeenCalled();

      (newGrid.stateChanged as EventEmitter<unknown>).emit(mockGridState);
      expect(mockFacade.notifyGridStateChanged).toHaveBeenCalled();
    });

    it('setGrid(undefined) tears down subscriptions from the previous grid', () => {
      createComponent();
      component.setGrid(undefined);
      fixture.detectChanges();

      (mockGridComponent.stateChanged as EventEmitter<unknown>).emit(
        mockGridState,
      );
      expect(mockFacade.notifyGridStateChanged).not.toHaveBeenCalled();
    });
  });
});
