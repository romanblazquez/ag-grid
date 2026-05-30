jest.mock('@fmr-pr000264/ames-ipref-v2-service', () => ({
  IPrefV2Service: jest.fn(),
}));

jest.mock('../grid-state/grid-state.utils', () => ({
  getEmptyGridState: jest.fn(),
  sanitizeGridState: jest.fn((s: unknown) => s),
  CustomGridState: {},
}));

jest.mock('@fmr-pr000539/shared/util/common', () => ({
  safeJsonParse: jest.fn((v: string) => JSON.parse(v)),
  safeDeepClone: jest.fn((v: unknown) => JSON.parse(JSON.stringify(v))),
}));

import { GridViewStorageService } from './grid-view-storage.service';
import { GridDefaultsConfigService } from './grid-defaults-config.service';
import { IPrefV2Service } from '@fmr-pr000264/ames-ipref-v2-service';
import { RuntimeConfigExt } from '@fmr-pr000539/eqt-ames-conf-preset';
import { GridViewModel } from '../../models/grid-view.model';
import { CustomGridState } from '../grid-state/grid-state.utils';
import { of, throwError } from 'rxjs';

const VALID_COL_IDS = new Set(['col1', 'col2']);

const mockGridState: CustomGridState = {
  sort: { sortModel: [] },
  expandAll: false,
};

const systemDefault: GridViewModel = {
  id: 'system:test-app:test-grid:Default View',
  name: 'Default View',
  isDefault: true,
  isSystemDefault: true,
  isSelected: true,
  gridState: mockGridState,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const userView: GridViewModel = {
  id: 'user-view-1',
  name: 'My View',
  isDefault: false,
  isSelected: false,
  gridState: mockGridState,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function buildService(
  iprefData: unknown = null,
  iprefSaveResult: unknown = {},
  systemDefaults: GridViewModel[] = [systemDefault],
) {
  const iprefService: jest.Mocked<IPrefV2Service> = {
    getPrefValue: jest.fn().mockReturnValue(of(iprefData)),
    savePref: jest.fn().mockReturnValue(of(iprefSaveResult)),
    deleteAllPrefs: jest.fn().mockReturnValue(of({})),
  } as any;

  const runtimeConfig: RuntimeConfigExt = {
    logicalEnvironment: 'DEV',
  } as RuntimeConfigExt;

  const gridDefaultsConfigService: jest.Mocked<GridDefaultsConfigService> = {
    getAllDefaultViewsForApp: jest.fn().mockReturnValue(of(systemDefaults)),
    getDefaultViewForApp: jest.fn().mockReturnValue(of(null)),
    getSharedViewsForApp: jest.fn().mockReturnValue(of([])),
  } as any;

  return {
    service: new GridViewStorageService(
      iprefService,
      runtimeConfig,
      gridDefaultsConfigService,
    ),
    iprefService,
    gridDefaultsConfigService,
  };
}

describe('GridViewStorageService', () => {
  describe('handleLoadedData - persistedSelectedId', () => {
    it('selects the system default view when persistedSelectedId matches its deterministic id', (done) => {
      const storedData = JSON.stringify({
        views: [{ ...userView }],
        version: 1,
        selectedViewId: systemDefault.id,
      });
      const { service } = buildService(storedData);

      service
        .loadViews(
          'test-grid',
          [{ colId: 'col1' }, { colId: 'col2' }],
          'test-app',
        )
        .subscribe((views) => {
          const selected = views.filter((v) => v.isSelected);
          expect(selected).toHaveLength(1);
          expect(selected[0].id).toBe(systemDefault.id);
          done();
        });
    });

    it('selects the user view when persistedSelectedId matches a user view', (done) => {
      const storedData = JSON.stringify({
        views: [{ ...userView }],
        version: 1,
        selectedViewId: userView.id,
      });
      const { service } = buildService(storedData);

      service
        .loadViews(
          'test-grid',
          [{ colId: 'col1' }, { colId: 'col2' }],
          'test-app',
        )
        .subscribe((views) => {
          const selected = views.filter((v) => v.isSelected);
          expect(selected).toHaveLength(1);
          expect(selected[0].id).toBe(userView.id);
          done();
        });
    });

    it('falls back to system default selection from isSelected flag when no persistedSelectedId', (done) => {
      const storedData = JSON.stringify({
        views: [{ ...userView }],
        version: 1,
        // no selectedViewId
      });
      const { service } = buildService(storedData);

      service
        .loadViews(
          'test-grid',
          [{ colId: 'col1' }, { colId: 'col2' }],
          'test-app',
        )
        .subscribe((views) => {
          // System default has isSelected: true from source
          const systemInResult = views.find((v) => v.id === systemDefault.id);
          expect(systemInResult?.isSelected).toBe(true);
          done();
        });
    });

    it('draft view always wins selection over persistedSelectedId', (done) => {
      const draftView: GridViewModel = {
        ...userView,
        id: 'draft-1',
        isDraft: true,
        isSelected: false,
      };
      const storedData = JSON.stringify({
        views: [{ ...userView }, draftView],
        version: 1,
        selectedViewId: userView.id,
      });
      const { service } = buildService(storedData);

      service
        .loadViews(
          'test-grid',
          [{ colId: 'col1' }, { colId: 'col2' }],
          'test-app',
        )
        .subscribe((views) => {
          const selected = views.filter((v) => v.isSelected);
          expect(selected).toHaveLength(1);
          expect(selected[0].id).toBe('draft-1');
          done();
        });
    });
  });

  describe('saveAllViews', () => {
    it('includes the selected view id in the saved payload', (done) => {
      const { service, iprefService } = buildService();
      const selectedView: GridViewModel = { ...userView, isSelected: true };
      const systemView: GridViewModel = {
        ...systemDefault,
        isSystemDefault: true,
      };

      service
        .saveAllViews('test-grid', [selectedView, systemView], 'test-app')
        .subscribe(() => {
          const savedPayload = JSON.parse(
            (iprefService.savePref as jest.Mock).mock.calls[0][3],
          );
          expect(savedPayload.selectedViewId).toBe(selectedView.id);
          done();
        });
    });

    it('persists null selectedViewId when no view is selected', (done) => {
      const { service, iprefService } = buildService();
      const unselected: GridViewModel = { ...userView, isSelected: false };

      service
        .saveAllViews('test-grid', [unselected], 'test-app')
        .subscribe(() => {
          const savedPayload = JSON.parse(
            (iprefService.savePref as jest.Mock).mock.calls[0][3],
          );
          expect(savedPayload.selectedViewId).toBeNull();
          done();
        });
    });

    it('does NOT include system default views in the saved view list', (done) => {
      const { service, iprefService } = buildService();
      const userSel: GridViewModel = { ...userView, isSelected: true };
      const sysView: GridViewModel = {
        ...systemDefault,
        isSystemDefault: true,
      };

      service
        .saveAllViews('test-grid', [userSel, sysView], 'test-app')
        .subscribe(() => {
          const savedPayload = JSON.parse(
            (iprefService.savePref as jest.Mock).mock.calls[0][3],
          );
          const savedIds = (savedPayload.views as GridViewModel[]).map(
            (v) => v.id,
          );
          expect(savedIds).not.toContain(sysView.id);
          expect(savedIds).toContain(userSel.id);
          done();
        });
    });
  });

  describe('loadViews - first time (null data)', () => {
    it('returns system defaults and saves them when iPref has no data', (done) => {
      const { service, iprefService } = buildService(null);

      service
        .loadViews('test-grid', [{ colId: 'col1' }], 'test-app')
        .subscribe((views) => {
          expect(views.some((v) => v.id === systemDefault.id)).toBe(true);
          expect(iprefService.savePref).toHaveBeenCalled();
          done();
        });
    });

    it('returns created default view when no system defaults available', (done) => {
      const { service } = buildService(null, {}, []);

      service
        .loadViews('test-grid', [{ colId: 'col1' }], 'test-app')
        .subscribe((views) => {
          expect(views.length).toBeGreaterThan(0);
          expect(views[0].isDefault).toBe(true);
          done();
        });
    });
  });

  describe('loadViews - error handling', () => {
    it('returns system defaults when iPref throws an error', (done) => {
      const iprefService: jest.Mocked<IPrefV2Service> = {
        getPrefValue: jest
          .fn()
          .mockReturnValue(throwError(() => new Error('network error'))),
        savePref: jest.fn(),
        deleteAllPrefs: jest.fn(),
      } as any;
      const runtimeConfig = { logicalEnvironment: 'DEV' } as RuntimeConfigExt;
      const gridDefaultsConfigService: jest.Mocked<GridDefaultsConfigService> =
        {
          getAllDefaultViewsForApp: jest
            .fn()
            .mockReturnValue(of([systemDefault])),
          getDefaultViewForApp: jest.fn().mockReturnValue(of(null)),
          getSharedViewsForApp: jest.fn().mockReturnValue(of([])),
        } as any;
      const service = new GridViewStorageService(
        iprefService,
        runtimeConfig,
        gridDefaultsConfigService,
      );

      service
        .loadViews('test-grid', [{ colId: 'col1' }], 'test-app')
        .subscribe((views) => {
          expect(views.some((v) => v.id === systemDefault.id)).toBe(true);
          done();
        });
    });
  });

  describe('getConfig', () => {
    it('builds the node using logicalEnvironment and appName', () => {
      const { service } = buildService();
      const config = service.getConfig('my-grid', 'MyApp');
      expect(config.node).toBe('DEV:MyApp:GRID');
      expect(config.gridId).toBe('my-grid');
    });
  });
});
