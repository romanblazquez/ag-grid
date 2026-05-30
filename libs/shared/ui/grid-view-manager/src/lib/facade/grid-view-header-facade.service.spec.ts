jest.mock('../data-access/grid-state/grid-state.utils', () => ({
  getEmptyGridState: jest.fn(() => ({
    sort: { sortModel: [] },
    expandAll: false,
  })),
  CustomGridState: {},
}));

import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { DestroyRef } from '@angular/core';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Subject, BehaviorSubject } from 'rxjs';
import { GridViewHeaderFacadeService } from './grid-view-header-facade.service';
import { GridEditSessionService } from '../services/grid-edit-session.service';
import * as gridViewActions from '../state/actions/grid-view.actions';
import { GridViewModel } from '../models/grid-view.model';
import { CustomGridState } from '../data-access/grid-state/grid-state.utils';
import { GridState } from '@ag-grid-community/core';

const mockGridState: CustomGridState = {
  sort: { sortModel: [] },
  expandAll: false,
};

const mockView: GridViewModel = {
  id: 'view-1',
  name: 'My View',
  isDefault: false,
  isSelected: true,
  gridState: mockGridState,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const VALID_COL_IDS = new Set(['col1', 'col2']);

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

describe('GridViewHeaderFacadeService', () => {
  let service: GridViewHeaderFacadeService;
  let store: MockStore;
  let actions$: Subject<any>;
  let editSession: jest.Mocked<GridEditSessionService>;

  beforeEach(() => {
    actions$ = new Subject<any>();

    editSession = {
      isUserChange: jest.fn().mockReturnValue(true),
      isSuppressing: jest.fn().mockReturnValue(false),
      commitBaseline: jest.fn(),
      hasChangedFromBaseline: jest.fn().mockReturnValue(true),
      suppressChanges: jest.fn(),
    } as unknown as jest.Mocked<GridEditSessionService>;

    TestBed.configureTestingModule({
      providers: [
        GridViewHeaderFacadeService,
        { provide: GridEditSessionService, useValue: editSession },
        provideMockStore({ initialState }),
        provideMockActions(() => actions$),
        {
          provide: DestroyRef,
          useValue: { onDestroy: jest.fn() },
        },
      ],
    });

    store = TestBed.inject(MockStore);
    service = TestBed.inject(GridViewHeaderFacadeService);
    service.init('test-grid');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('notifyGridStateChanged', () => {
    it('sets isSaving$ to true immediately on notification', fakeAsync(() => {
      let saving: boolean | undefined;
      service.isSaving$.subscribe((v) => (saving = v));

      service.notifyGridStateChanged(
        'test-grid',
        mockGridState as unknown as GridState,
        [],
        VALID_COL_IDS,
      );

      expect(saving).toBe(true);
    }));

    it('clears hasStateChanged$ to false immediately on notification', fakeAsync(() => {
      let changed: boolean | undefined;
      service.hasStateChanged$.subscribe((v) => (changed = v));

      service.notifyGridStateChanged(
        'test-grid',
        mockGridState as unknown as GridState,
        [],
        VALID_COL_IDS,
      );

      expect(changed).toBe(false);
    }));

    it('sets hasStateChanged$ to true after debounce settles (baseline changed)', fakeAsync(() => {
      editSession.hasChangedFromBaseline.mockReturnValue(true);
      let changed = false;
      service.hasStateChanged$.subscribe((v) => (changed = v));

      service.notifyGridStateChanged(
        'test-grid',
        mockGridState as unknown as GridState,
        [],
        VALID_COL_IDS,
      );
      tick(GridViewHeaderFacadeService.DEBOUNCE_DELAY_MS);

      expect(changed).toBe(true);
    }));

    it('does NOT set hasStateChanged$ when baseline gate says no change', fakeAsync(() => {
      editSession.hasChangedFromBaseline.mockReturnValue(false);
      let changed = false;
      service.hasStateChanged$.subscribe((v) => (changed = v));

      service.notifyGridStateChanged(
        'test-grid',
        mockGridState as unknown as GridState,
        [],
        VALID_COL_IDS,
      );
      tick(GridViewHeaderFacadeService.DEBOUNCE_DELAY_MS);

      expect(changed).toBe(false);
    }));

    it('dispatches saveDraftView after debounce when baseline changed', fakeAsync(() => {
      editSession.hasChangedFromBaseline.mockReturnValue(true);
      const dispatchSpy = jest.spyOn(store, 'dispatch');

      service.notifyGridStateChanged(
        'test-grid',
        mockGridState as unknown as GridState,
        [{ colId: 'col1' }],
        VALID_COL_IDS,
      );
      tick(GridViewHeaderFacadeService.DEBOUNCE_DELAY_MS);

      expect(dispatchSpy).toHaveBeenCalled();
      const call = dispatchSpy.mock.calls.find(
        ([action]) =>
          (action as any).type === gridViewActions.saveDraftView.type,
      );
      expect(call).toBeDefined();
    }));

    it('debounces rapid successive calls to one settled event', fakeAsync(() => {
      editSession.hasChangedFromBaseline.mockReturnValue(true);
      const dispatchSpy = jest.spyOn(store, 'dispatch');

      service.notifyGridStateChanged(
        'test-grid',
        mockGridState as unknown as GridState,
        [],
        VALID_COL_IDS,
      );
      tick(100);
      service.notifyGridStateChanged(
        'test-grid',
        mockGridState as unknown as GridState,
        [],
        VALID_COL_IDS,
      );
      tick(100);
      service.notifyGridStateChanged(
        'test-grid',
        mockGridState as unknown as GridState,
        [],
        VALID_COL_IDS,
      );
      tick(GridViewHeaderFacadeService.DEBOUNCE_DELAY_MS);

      const draftDispatches = dispatchSpy.mock.calls.filter(
        ([action]) =>
          (action as any).type === gridViewActions.saveDraftView.type,
      );
      expect(draftDispatches).toHaveLength(1);
    }));
  });

  describe('hasUnsavedChanges$', () => {
    it('emits true after debounce settles with a real state change', fakeAsync(() => {
      editSession.hasChangedFromBaseline.mockReturnValue(true);

      let hasUnsaved: boolean | undefined;
      service.hasUnsavedChanges$.subscribe((v) => (hasUnsaved = v));

      service.notifyGridStateChanged(
        'test-grid',
        mockGridState as unknown as GridState,
        [],
        VALID_COL_IDS,
      );
      tick(GridViewHeaderFacadeService.DEBOUNCE_DELAY_MS);

      expect(hasUnsaved).toBe(true);
    }));
  });

  describe('selectView', () => {
    it('dispatches selectGridView with the matching view id', () => {
      const dispatchSpy = jest.spyOn(store, 'dispatch');
      const views: GridViewModel[] = [mockView];

      service.selectView('test-grid', views, 'My View', 'test-app');

      expect(dispatchSpy).toHaveBeenCalledWith(
        gridViewActions.selectGridView({
          gridId: 'test-grid',
          viewId: 'view-1',
          appName: 'test-app',
        }),
      );
    });

    it('does not dispatch if view name not found', () => {
      const dispatchSpy = jest.spyOn(store, 'dispatch');
      service.selectView('test-grid', [mockView], 'NONEXISTENT', 'test-app');
      expect(dispatchSpy).not.toHaveBeenCalled();
    });
  });
});
