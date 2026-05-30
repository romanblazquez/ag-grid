jest.mock('../data-access/grid-state/grid-state.utils', () => ({
  ...jest.requireActual('../data-access/grid-state/grid-state.utils'),
  applyGridStateHelper: jest.fn(),
  getEmptyGridState: jest.fn(() => ({
    sort: { sortModel: [] },
    expandAll: false,
  })),
  areGridStatesEqual: jest.fn(() => false),
}));

jest.mock('@fmr-pr000539/shared/util/common', () => ({
  safeDeepClone: jest.fn((v: unknown) => JSON.parse(JSON.stringify(v))),
}));

import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { EventEmitter } from '@angular/core';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Subject } from 'rxjs';
import { GridViewManagerDirective } from './grid-view-manager.directive';
import { GridEditSessionService } from '../services/grid-edit-session.service';
import * as gridViewActions from '../state/actions/grid-view.actions';
import { EqtCommonGridComponent } from '@fmr-pr000539/eqt-common-grid';
import * as eqtGrid from '../data-access/grid-state/grid-state.utils';
import { GridViewModel } from '../models/grid-view.model';
import { Actions } from '@ngrx/effects';

const mockGridState = {
  sort: { sortModel: [] },
  columnOrder: { orderedColIds: ['col1', 'col2'] },
  expandAll: false,
};

const mockView: GridViewModel = {
  id: 'view-1',
  name: 'View 1',
  isDefault: true,
  isSelected: true,
  gridState: mockGridState,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function buildMockGrid(
  overrides: Partial<EqtCommonGridComponent> = {},
): EqtCommonGridComponent {
  return {
    gridId: '',
    gridApi: {
      getState: jest.fn().mockReturnValue(mockGridState),
      getColumns: jest
        .fn()
        .mockReturnValue([
          { getColId: () => 'col1' },
          { getColId: () => 'col2' },
        ]),
      forEachNode: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
    columnDefs: [{ colId: 'col1' }, { colId: 'col2' }],
    appName: 'test-app',
    gridReadyEvent: new EventEmitter(),
    stateChanged: new EventEmitter(),
    sortChanged: new EventEmitter(),
    collapseAll: jest.fn(),
    syncExpandCollapseState: jest.fn(),
    ...overrides,
  } as unknown as EqtCommonGridComponent;
}

const initialState = {
  gridViewManager: {
    gridViews: {
      'test-grid': {
        views: [mockView],
        selectedViewId: 'view-1',
        defaultViewId: 'view-1',
        loading: false,
        error: null,
      },
    },
  },
};

describe('GridViewManagerDirective', () => {
  let directive: GridViewManagerDirective;
  let store: MockStore;
  let editSession: GridEditSessionService;
  let actions$: Subject<any>;
  let mockGrid: EqtCommonGridComponent;

  beforeEach(() => {
    actions$ = new Subject<any>();
    mockGrid = buildMockGrid();

    TestBed.configureTestingModule({
      providers: [
        GridViewManagerDirective,
        GridEditSessionService,
        provideMockStore({ initialState }),
        provideMockActions(() => actions$),
        { provide: EqtCommonGridComponent, useValue: mockGrid },
      ],
    });

    store = TestBed.inject(MockStore);
    directive = TestBed.inject(GridViewManagerDirective);
    editSession = TestBed.inject(GridEditSessionService);

    directive.gridId = 'test-grid';
    directive.appName = 'test-app';

    jest.spyOn(store as any, 'dispatch').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('resolvedId', () => {
    it('uses gridId input when provided', () => {
      directive.gridId = 'explicit-id';
      directive.ngOnInit();
      expect(directive.resolvedId).toBe('explicit-id');
    });

    it('falls back to grid element id when gridId is empty', () => {
      directive.gridId = '';
      mockGrid = buildMockGrid({ gridId: 'element-id' } as any);
      (directive as any).grid = mockGrid;
      directive.ngOnInit();
      expect(directive.resolvedId).toBe('element-id');
    });

    it('throws when both gridId and grid element id are empty', () => {
      directive.gridId = '';
      mockGrid = buildMockGrid({ gridId: '' } as any);
      (directive as any).grid = mockGrid;
      expect(() => directive.ngOnInit()).toThrow('[GridViewManager]');
    });
  });

  describe('propagateToGrid', () => {
    it('calls suppressChanges around applyGridStateHelper', () => {
      const suppressSpy = jest.spyOn(editSession, 'suppressChanges');
      (directive as any).propagateToGrid(mockView);
      expect(suppressSpy).toHaveBeenCalledTimes(1);
      expect(eqtGrid.applyGridStateHelper).toHaveBeenCalledTimes(2);
    });

    it('commits baseline from gridApi.getState() after apply', () => {
      const commitSpy = jest.spyOn(editSession, 'commitBaseline');
      (directive as any).propagateToGrid(mockView);
      expect(commitSpy).toHaveBeenCalledWith(mockGridState, expect.any(Set));
    });

    it('skips apply and commits baseline when grid already shows target state', () => {
      (eqtGrid.areGridStatesEqual as jest.Mock).mockReturnValueOnce(true);
      // Clear calls from previous tests so we can assert "not called" cleanly
      (eqtGrid.applyGridStateHelper as jest.Mock).mockClear();
      const commitSpy = jest.spyOn(editSession, 'commitBaseline');
      const suppressSpy = jest.spyOn(editSession, 'suppressChanges');

      (directive as any).propagateToGrid(mockView);

      expect(suppressSpy).not.toHaveBeenCalled();
      expect(eqtGrid.applyGridStateHelper).not.toHaveBeenCalled();
      expect(commitSpy).toHaveBeenCalledTimes(1);
    });

    it('synthesizes column order from columnDefs when view has none', () => {
      const viewNoOrder: GridViewModel = {
        ...mockView,
        gridState: { ...mockGridState, columnOrder: { orderedColIds: [] } },
      };
      (eqtGrid.areGridStatesEqual as jest.Mock).mockReturnValueOnce(false);
      (directive as any).propagateToGrid(viewNoOrder);

      const secondCall = (eqtGrid.applyGridStateHelper as jest.Mock).mock
        .calls[1];
      expect(secondCall[1].columnOrder.orderedColIds).toEqual(['col1', 'col2']);
    });
  });

  describe('commitDraftViewSuccess baseline refresh', () => {
    it('calls refreshBaselineFromGrid when commitDraftViewSuccess fires for this grid', fakeAsync(() => {
      directive.ngOnInit();
      (mockGrid.gridReadyEvent as EventEmitter<any>).emit();
      tick();

      const commitSpy = jest.spyOn(editSession, 'commitBaseline');
      commitSpy.mockReset();

      actions$.next(
        gridViewActions.commitDraftViewSuccess({
          gridId: 'test-grid',
          sourceView: mockView,
        }),
      );
      tick();

      expect(commitSpy).toHaveBeenCalled();
    }));

    it('ignores commitDraftViewSuccess for a different gridId', fakeAsync(() => {
      directive.ngOnInit();
      (mockGrid.gridReadyEvent as EventEmitter<any>).emit();
      tick();

      const commitSpy = jest.spyOn(editSession, 'commitBaseline');
      commitSpy.mockReset();

      actions$.next(
        gridViewActions.commitDraftViewSuccess({
          gridId: 'OTHER-GRID',
          sourceView: mockView,
        }),
      );
      tick();

      expect(commitSpy).not.toHaveBeenCalled();
    }));
  });

  describe('updateGridViewSuccess baseline refresh', () => {
    it('refreshes baseline on updateGridViewSuccess for this grid', fakeAsync(() => {
      directive.ngOnInit();
      (mockGrid.gridReadyEvent as EventEmitter<any>).emit();
      tick();

      const commitSpy = jest.spyOn(editSession, 'commitBaseline');
      commitSpy.mockReset();

      actions$.next(
        gridViewActions.updateGridViewSuccess({
          gridId: 'test-grid',
          view: mockView,
        }),
      );
      tick();

      expect(commitSpy).toHaveBeenCalled();
    }));
  });

  describe('propagation pipeline', () => {
    it('propagateToGrid is called via propagate$ when view switch occurs', fakeAsync(() => {
      directive.ngOnInit();
      (mockGrid.gridReadyEvent as EventEmitter<any>).emit();
      tick();

      const propagateSpy = jest.spyOn(directive as any, 'propagateToGrid');
      propagateSpy.mockReset();

      (directive as any).propagate$.next();
      tick();

      expect(propagateSpy).toHaveBeenCalledWith(mockView);
    }));

    it('resetToActiveView triggers propagateToGrid with the active view', fakeAsync(() => {
      directive.ngOnInit();
      (mockGrid.gridReadyEvent as EventEmitter<any>).emit();
      tick();

      const propagateSpy = jest.spyOn(directive as any, 'propagateToGrid');
      propagateSpy.mockReset();

      directive.resetToActiveView();
      tick();

      expect(propagateSpy).toHaveBeenCalledWith(mockView);
    }));

    it('registerFirstRowDataHandler removes listener and emits to propagate$ on first rowDataUpdated', fakeAsync(() => {
      directive.ngOnInit();
      (mockGrid.gridReadyEvent as EventEmitter<any>).emit();
      tick();

      const propagateSpy = jest.spyOn(directive as any, 'propagateToGrid');
      propagateSpy.mockReset();

      const addListenerCall = (
        mockGrid.gridApi.addEventListener as jest.Mock
      ).mock.calls.find(([event]: [string]) => event === 'rowDataUpdated');
      const handler = addListenerCall?.[1] as () => void;
      handler();
      tick();

      expect(mockGrid.gridApi.removeEventListener).toHaveBeenCalledWith(
        'rowDataUpdated',
        handler,
      );
      expect(propagateSpy).toHaveBeenCalledWith(mockView);
    }));

    it('propagate$ with null activeView does not call propagateToGrid', fakeAsync(() => {
      store.setState({
        gridViewManager: {
          gridViews: {
            'test-grid': {
              views: [],
              selectedViewId: null,
              defaultViewId: null,
              loading: false,
              error: null,
            },
          },
        },
      });

      directive.ngOnInit();
      (mockGrid.gridReadyEvent as EventEmitter<any>).emit();
      tick();

      const propagateSpy = jest.spyOn(directive as any, 'propagateToGrid');
      propagateSpy.mockReset();

      (directive as any).propagate$.next();
      tick();

      expect(propagateSpy).not.toHaveBeenCalled();
    }));
  });
});
