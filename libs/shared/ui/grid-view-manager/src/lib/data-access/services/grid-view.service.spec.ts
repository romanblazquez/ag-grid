// -------------------- MOCKS (must be before imports) --------------------
jest.mock('@fmr-pr000264/ames-ipref-v2-service', () => ({
  IPrefV2Service: jest.fn(),
}));
jest.mock('../grid-state/grid-state.utils', () => ({
  getEmptyGridState: jest.fn(),
  sanitizeGridState: jest.fn(),
  CustomGridState: {},
}));
jest.mock('../defaults/defaultViews', () => ({
  getAllDefaultViewsForApp: jest.fn(),
}));
jest.mock('@fmr-pr000539/shared/util/common', () => ({
  safeJsonParse: jest.fn(),
  safeDeepClone: jest.fn(),
}));

// -------------------- IMPORTS --------------------
import { GridViewService } from './grid-view.service';
import { GridViewStorageService } from './grid-view-storage.service';
import { of, throwError } from 'rxjs';
import { IPrefV2Service } from '@fmr-pr000264/ames-ipref-v2-service';
import { RuntimeConfigExt } from '@fmr-pr000539/eqt-ames-conf-preset';
import { GridViewModel } from '../../models/grid-view.model';
import { GRID_VIEW_CONSTRAINTS } from '../../models/grid-view-state.model';
import { getAllDefaultViewsForApp } from '../defaults/defaultViews';
import { GridDefaultsConfigService } from './grid-defaults-config.service';
import * as utilCommon from '@fmr-pr000539/shared/util/common';
import * as eqtCommonGrid from '../grid-state/grid-state.utils';
import { CustomGridState } from '../grid-state/grid-state.utils';

describe('GridViewService', () => {
  let service: GridViewService;
  let storageService: GridViewStorageService;
  let iprefService: jest.Mocked<IPrefV2Service>;
  let runtimeEnvExtension: RuntimeConfigExt;
  let gridDefaultsConfigService: jest.Mocked<GridDefaultsConfigService>;

  const mockGridId = 'grid1';
  const mockAppName = 'TestApp';
  const mockColumnDefs = [{ colId: 'col1' }, { colId: 'col2' }];
  const mockGridState: CustomGridState = {};
  const mockView: GridViewModel = {
    id: 'view1',
    name: 'View 1',
    description: 'desc',
    isDefault: false,
    isSelected: false,
    gridState: mockGridState,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    iprefService = {
      getPrefValue: jest.fn(),
      savePref: jest.fn(),
      deleteAllPrefs: jest.fn(),
    } as any;
    runtimeEnvExtension = { logicalEnvironment: 'DEV' } as RuntimeConfigExt;
    gridDefaultsConfigService = {
      getAllDefaultViewsForApp: jest.fn().mockReturnValue(of([])),
    } as any;
    (utilCommon.safeJsonParse as jest.Mock).mockImplementation((v) =>
      JSON.parse(v),
    );
    (utilCommon.safeDeepClone as jest.Mock).mockImplementation((v) =>
      JSON.parse(JSON.stringify(v)),
    );
    (eqtCommonGrid.getEmptyGridState as jest.Mock).mockReturnValue({});
    (eqtCommonGrid.sanitizeGridState as jest.Mock).mockImplementation(
      (state, colIds) => state,
    );
    (getAllDefaultViewsForApp as jest.Mock).mockReturnValue([]);

    storageService = new GridViewStorageService(
      iprefService,
      runtimeEnvExtension,
      gridDefaultsConfigService,
    );
    service = new GridViewService(storageService);
  });

  describe('constructor & getConfig', () => {
    it('should create service and return config', () => {
      const config = service.getConfig('grid1', 'App');
      expect(config).toEqual({
        appName: 'EquityTrading',
        node: 'DEV:App:GRID',
        gridId: 'grid1',
      });
    });
  });

  describe('getCurrentPrefState', () => {
    it('should return grid state if valid', async () => {
      iprefService.getPrefValue.mockReturnValue(of(mockGridState));
      const result = await service.getCurrentPrefState(mockGridId, mockAppName);
      expect(result).toEqual(mockGridState);
    });

    it('should return empty object if invalid or error', async () => {
      iprefService.getPrefValue.mockReturnValue(of(null));
      const result = await service.getCurrentPrefState(mockGridId, mockAppName);
      expect(result).toEqual({});
      iprefService.getPrefValue.mockReturnValue(
        throwError(() => new Error('fail')),
      );
      const result2 = await service.getCurrentPrefState(
        mockGridId,
        mockAppName,
      );
      expect(result2).toEqual({});
    });
  });

  describe('loadViews', () => {
    it('should return system defaults if no data', (done) => {
      gridDefaultsConfigService.getAllDefaultViewsForApp.mockReturnValue(
        of([{ ...mockView }]),
      );
      iprefService.getPrefValue.mockReturnValue(of(undefined));
      service
        .loadViews(mockGridId, mockColumnDefs, mockAppName)
        .subscribe((views) => {
          expect(views[0].isSystemDefault).toBe(true);
          done();
        });
    });

    it('should parse string data and merge views', (done) => {
      gridDefaultsConfigService.getAllDefaultViewsForApp.mockReturnValue(
        of([{ ...mockView }]),
      );
      iprefService.getPrefValue.mockReturnValue(
        of(JSON.stringify({ views: [mockView] })),
      );
      service
        .loadViews(mockGridId, mockColumnDefs, mockAppName)
        .subscribe((views) => {
          expect(views.length).toBe(2);
          done();
        });
    });

    it('should handle object data and merge views', (done) => {
      gridDefaultsConfigService.getAllDefaultViewsForApp.mockReturnValue(
        of([{ ...mockView }]),
      );
      iprefService.getPrefValue.mockReturnValue(of({ views: [mockView] }));
      service
        .loadViews(mockGridId, mockColumnDefs, mockAppName)
        .subscribe((views) => {
          expect(views.length).toBe(2);
          done();
        });
    });

    it('should return default view on error', (done) => {
      iprefService.getPrefValue.mockReturnValue(
        throwError(() => new Error('fail')),
      );
      service
        .loadViews(mockGridId, mockColumnDefs, mockAppName)
        .subscribe((views) => {
          expect(views[0].name).toBe('Default View');
          done();
        });
    });
  });

  describe('createView', () => {
    it('should create a new view and save', (done) => {
      iprefService.getPrefValue.mockReturnValue(of({ views: [] }));
      iprefService.savePref.mockReturnValue(of(undefined));
      service
        .createView(
          mockGridId,
          {
            name: mockView.name,
            description: mockView.description,
            isDefault: mockView.isDefault,
            isSelected: mockView.isSelected,
            gridState: mockView.gridState,
          },
          mockColumnDefs,
          mockAppName,
        )
        .subscribe((newView) => {
          expect(newView.name).toBe(mockView.name);
          expect(iprefService.savePref).toHaveBeenCalled();
          done();
        });
    });

    it('should throw error if max views reached', (done) => {
      iprefService.getPrefValue.mockReturnValue(
        of({ views: Array(GRID_VIEW_CONSTRAINTS.MAX_VIEWS).fill(mockView) }),
      );
      service
        .createView(mockGridId, { ...mockView }, mockColumnDefs, mockAppName)
        .subscribe({
          error: (err) => {
            expect(err.message).toContain('Maximum number of views');
            done();
          },
        });
    });

    it('should throw error if duplicate name', (done) => {
      iprefService.getPrefValue.mockReturnValue(
        of({ views: [{ ...mockView }] }),
      );
      service
        .createView(
          mockGridId,
          {
            name: mockView.name,
            description: mockView.description,
            isDefault: mockView.isDefault,
            isSelected: mockView.isSelected,
            gridState: mockView.gridState,
          },
          mockColumnDefs,
          mockAppName,
        )
        .subscribe({
          error: (err) => {
            expect(err.message).toContain('already exists');
            done();
          },
        });
    });
  });

  describe('updateView', () => {
    it('should update a view and save', (done) => {
      iprefService.getPrefValue.mockReturnValue(
        of({ views: [{ ...mockView }] }),
      );
      iprefService.savePref.mockReturnValue(of(undefined));
      service
        .updateView(
          mockGridId,
          { ...mockView, name: 'Updated' },
          mockColumnDefs,
          mockAppName,
        )
        .subscribe((updatedView) => {
          expect(updatedView.name).toBe('Updated');
          expect(iprefService.savePref).toHaveBeenCalled();
          done();
        });
    });

    it('should throw error if view not found', (done) => {
      iprefService.getPrefValue.mockReturnValue(of({ views: [] }));
      service
        .updateView(mockGridId, { ...mockView }, mockColumnDefs, mockAppName)
        .subscribe({
          error: (err) => {
            expect(err.message).toContain('not found');
            done();
          },
        });
    });

    it('should throw error if updating system default', (done) => {
      iprefService.getPrefValue.mockReturnValue(
        of({ views: [{ ...mockView, isSystemDefault: true }] }),
      );
      service
        .updateView(
          mockGridId,
          { ...mockView, isSystemDefault: true },
          mockColumnDefs,
          mockAppName,
        )
        .subscribe({
          error: (err) => {
            expect(err.message).toContain('Cannot update system default');
            done();
          },
        });
    });

    it('should throw error if duplicate name', (done) => {
      iprefService.getPrefValue.mockReturnValue(
        of({
          views: [
            { ...mockView },
            { ...mockView, id: 'view2', name: 'Updated' },
          ],
        }),
      );
      service
        .updateView(
          mockGridId,
          { ...mockView, name: 'Updated' },
          mockColumnDefs,
          mockAppName,
        )
        .subscribe({
          error: (err) => {
            expect(err.message).toContain('already exists');
            done();
          },
        });
    });
  });

  describe('deleteView', () => {
    it('should delete a view and save', (done) => {
      iprefService.getPrefValue.mockReturnValue(
        of({ views: [{ ...mockView }, { ...mockView, id: 'view2' }] }),
      );
      iprefService.savePref.mockReturnValue(of(undefined));
      service
        .deleteView(mockGridId, 'view2', mockColumnDefs, mockAppName)
        .subscribe(() => {
          expect(iprefService.savePref).toHaveBeenCalled();
          done();
        });
    });

    it('should throw error if view not found', (done) => {
      iprefService.getPrefValue.mockReturnValue(
        of({ views: [{ ...mockView }] }),
      );
      service
        .deleteView(mockGridId, 'notfound', mockColumnDefs, mockAppName)
        .subscribe({
          error: (err) => {
            expect(err.message).toContain('not found');
            done();
          },
        });
    });

    it('should throw error if deleting system default', (done) => {
      iprefService.getPrefValue.mockReturnValue(
        of({ views: [{ ...mockView, isSystemDefault: true }] }),
      );
      service
        .deleteView(mockGridId, mockView.id, mockColumnDefs, mockAppName)
        .subscribe({
          error: (err) => {
            expect(err.message).toContain('System defaults are read-only');
            done();
          },
        });
    });

    it('should throw error if deleting last view', (done) => {
      iprefService.getPrefValue.mockReturnValue(
        of({ views: [{ ...mockView }] }),
      );
      service
        .deleteView(mockGridId, mockView.id, mockColumnDefs, mockAppName)
        .subscribe({
          error: (err) => {
            expect(err.message).toContain('last remaining view');
            done();
          },
        });
    });

    it('should throw error if deleting default view', (done) => {
      iprefService.getPrefValue.mockReturnValue(
        of({
          views: [
            { ...mockView },
            { ...mockView, id: 'view2', isDefault: true },
          ],
        }),
      );
      service
        .deleteView(mockGridId, 'view2', mockColumnDefs, mockAppName)
        .subscribe({
          error: (err) => {
            expect(err.message).toContain('default view');
            done();
          },
        });
    });
  });

  describe('saveAllViews', () => {
    it('should call saveViewsInternal', (done) => {
      iprefService.savePref.mockReturnValue(of(undefined));
      service
        .saveAllViews(mockGridId, [mockView], mockAppName)
        .subscribe(() => {
          expect(iprefService.savePref).toHaveBeenCalled();
          done();
        });
    });
  });

  describe('deleteAllViews', () => {
    it('should call deleteAllPrefs', (done) => {
      iprefService.deleteAllPrefs.mockReturnValue(of(undefined));
      service.deleteAllViews(mockGridId, mockAppName).subscribe(() => {
        expect(iprefService.deleteAllPrefs).toHaveBeenCalled();
        done();
      });
    });

    it('should handle error', (done) => {
      iprefService.deleteAllPrefs.mockReturnValue(
        throwError(() => new Error('fail')),
      );
      service.deleteAllViews(mockGridId, mockAppName).subscribe({
        error: (err) => {
          expect(err.message).toContain('Failed to delete all views');
          done();
        },
      });
    });
  });

  // ── Draft view tests ────────────────────────────────────────────────────────

  describe('saveDraft', () => {
    const mockDraftGridState = { columns: {} } as any;

    it('should create a new draft named "{sourceName} - Draft"', (done) => {
      iprefService.getPrefValue.mockReturnValue(
        of({ views: [{ ...mockView }] }),
      );
      iprefService.savePref.mockReturnValue(of(undefined));

      service
        .saveDraft(
          mockGridId,
          mockView.id,
          mockView.name,
          mockDraftGridState,
          mockColumnDefs,
          mockAppName,
        )
        .subscribe((draft) => {
          expect(draft.isDraft).toBe(true);
          expect(draft.name).toBe(
            `${GRID_VIEW_CONSTRAINTS.DRAFT_PREFIX}${mockView.name}${GRID_VIEW_CONSTRAINTS.DRAFT_SUFFIX}`,
          );
          expect(draft.draftSourceViewId).toBe(mockView.id);
          expect(draft.isSelected).toBe(true);
          expect(iprefService.savePref).toHaveBeenCalled();
          done();
        });
    });

    it('should update the existing draft instead of creating a duplicate', (done) => {
      const existingDraft: GridViewModel = {
        ...mockView,
        id: 'draft-id',
        name: `${GRID_VIEW_CONSTRAINTS.DRAFT_PREFIX}${mockView.name}${GRID_VIEW_CONSTRAINTS.DRAFT_SUFFIX}`,
        isDraft: true,
        draftSourceViewId: mockView.id,
        isSelected: true,
      };
      iprefService.getPrefValue.mockReturnValue(
        of({ views: [{ ...mockView }, existingDraft] }),
      );
      iprefService.savePref.mockReturnValue(of(undefined));

      service
        .saveDraft(
          mockGridId,
          mockView.id,
          mockView.name,
          mockDraftGridState,
          mockColumnDefs,
          mockAppName,
        )
        .subscribe((draft) => {
          expect(draft.id).toBe('draft-id');
          // Only one draft should appear in the saved payload
          const savedPayload = JSON.parse(
            iprefService.savePref.mock.calls[0][3] as string,
          );
          const draftCount = savedPayload.views.filter(
            (v: GridViewModel) => v.isDraft,
          ).length;
          expect(draftCount).toBe(1);
          done();
        });
    });

    it('should deselect all other views when creating a draft', (done) => {
      const selectedView: GridViewModel = { ...mockView, isSelected: true };
      iprefService.getPrefValue.mockReturnValue(of({ views: [selectedView] }));
      iprefService.savePref.mockReturnValue(of(undefined));

      service
        .saveDraft(
          mockGridId,
          mockView.id,
          mockView.name,
          mockDraftGridState,
          mockColumnDefs,
          mockAppName,
        )
        .subscribe(() => {
          const saved = JSON.parse(
            iprefService.savePref.mock.calls[0][3] as string,
          );
          const nonDraft = saved.views.filter((v: GridViewModel) => !v.isDraft);
          expect(nonDraft.every((v: GridViewModel) => !v.isSelected)).toBe(
            true,
          );
          done();
        });
    });

    it('should use the caller-supplied name even when source view is not in existingViews (e.g. system default with different ID)', (done) => {
      // Scenario: source is a system default whose ID may differ across loadViews() calls
      iprefService.getPrefValue.mockReturnValue(of({ views: [] }));
      iprefService.savePref.mockReturnValue(of(undefined));

      service
        .saveDraft(
          mockGridId,
          'sys-def-id',
          'Portfolio Overview',
          mockDraftGridState,
          mockColumnDefs,
          mockAppName,
        )
        .subscribe((draft) => {
          expect(draft.name).toBe(
            `${GRID_VIEW_CONSTRAINTS.DRAFT_PREFIX}Portfolio Overview${GRID_VIEW_CONSTRAINTS.DRAFT_SUFFIX}`,
          );
          done();
        });
    });

    it('should still return the draft even if iPref save fails', (done) => {
      iprefService.getPrefValue.mockReturnValue(
        of({ views: [{ ...mockView }] }),
      );
      iprefService.savePref.mockReturnValue(
        throwError(() => new Error('save fail')),
      );

      service
        .saveDraft(
          mockGridId,
          mockView.id,
          mockView.name,
          mockDraftGridState,
          mockColumnDefs,
          mockAppName,
        )
        .subscribe((draft) => {
          expect(draft.isDraft).toBe(true);
          done();
        });
    });
  });

  describe('deleteDraft', () => {
    it('should remove the draft and persist the remaining views', (done) => {
      const draft: GridViewModel = {
        ...mockView,
        id: 'draft-id',
        isDraft: true,
        draftSourceViewId: mockView.id,
        isSelected: true,
      };
      const view2: GridViewModel = {
        ...mockView,
        id: 'view2',
        isDefault: true,
      };
      iprefService.getPrefValue.mockReturnValue(
        of({ views: [{ ...mockView }, view2, draft] }),
      );
      iprefService.savePref.mockReturnValue(of(undefined));

      service
        .deleteDraft(mockGridId, mockColumnDefs, mockAppName)
        .subscribe(() => {
          const saved = JSON.parse(
            iprefService.savePref.mock.calls[0][3] as string,
          );
          expect(saved.views.some((v: GridViewModel) => v.isDraft)).toBe(false);
          expect(iprefService.savePref).toHaveBeenCalled();
          done();
        });
    });

    it('should mark the fallback view as selected after deleting the draft', (done) => {
      const draft: GridViewModel = {
        ...mockView,
        id: 'draft-id',
        isDraft: true,
        draftSourceViewId: mockView.id,
        isSelected: true,
      };
      const targetView: GridViewModel = {
        ...mockView,
        id: 'target',
        isDefault: true,
        isSelected: false,
      };
      iprefService.getPrefValue.mockReturnValue(
        of({ views: [{ ...mockView }, targetView, draft] }),
      );
      iprefService.savePref.mockReturnValue(of(undefined));

      service
        .deleteDraft(mockGridId, mockColumnDefs, mockAppName, 'target')
        .subscribe(() => {
          const saved = JSON.parse(
            iprefService.savePref.mock.calls[0][3] as string,
          );
          const selected = saved.views.find((v: GridViewModel) => v.isSelected);
          expect(selected?.id).toBe('target');
          done();
        });
    });

    it('should be a no-op when no draft exists', (done) => {
      iprefService.getPrefValue.mockReturnValue(
        of({ views: [{ ...mockView }] }),
      );

      service
        .deleteDraft(mockGridId, mockColumnDefs, mockAppName)
        .subscribe(() => {
          expect(iprefService.savePref).not.toHaveBeenCalled();
          done();
        });
    });
  });

  describe('commitDraft', () => {
    it('should update the source view with draft gridState and remove the draft', (done) => {
      const newGridState: CustomGridState = { columns: { state: [] } } as any;
      const draft: GridViewModel = {
        ...mockView,
        id: 'draft-id',
        name: `${GRID_VIEW_CONSTRAINTS.DRAFT_PREFIX}${mockView.name}${GRID_VIEW_CONSTRAINTS.DRAFT_SUFFIX}`,
        isDraft: true,
        draftSourceViewId: mockView.id,
        isSelected: true,
        gridState: newGridState,
      };
      iprefService.getPrefValue.mockReturnValue(
        of({ views: [{ ...mockView, isSelected: false }, draft] }),
      );
      iprefService.savePref.mockReturnValue(of(undefined));

      service
        .commitDraft(mockGridId, mockColumnDefs, mockAppName)
        .subscribe((result) => {
          expect(result.committed).toBe(true);
          expect(result.sourceView?.id).toBe(mockView.id);
          expect(result.sourceView?.isSelected).toBe(true);
          const saved = JSON.parse(
            iprefService.savePref.mock.calls[0][3] as string,
          );
          expect(saved.views.some((v: GridViewModel) => v.isDraft)).toBe(false);
          done();
        });
    });

    it('should return { committed: false } when source is a system default (preset)', (done) => {
      const systemDefault: GridViewModel = {
        ...mockView,
        id: 'sys-default',
        isSystemDefault: true,
        isSelected: false,
      };
      const draft: GridViewModel = {
        ...mockView,
        id: 'draft-id',
        isDraft: true,
        draftSourceViewId: 'sys-default',
        isSelected: true,
      };
      iprefService.getPrefValue.mockReturnValue(of({ views: [draft] }));
      gridDefaultsConfigService.getAllDefaultViewsForApp.mockReturnValue(
        of([systemDefault]),
      );

      service
        .commitDraft(mockGridId, mockColumnDefs, mockAppName)
        .subscribe((result) => {
          expect(result.committed).toBe(false);
          expect(result.draftView?.id).toBe('draft-id');
          expect(result.sourceView?.id).toBe('sys-default');
          expect(iprefService.savePref).not.toHaveBeenCalled();
          done();
        });
    });

    it('should return { committed: false } when source view is not found', (done) => {
      const draft: GridViewModel = {
        ...mockView,
        id: 'draft-id',
        isDraft: true,
        draftSourceViewId: 'missing-id',
        isSelected: true,
      };
      iprefService.getPrefValue.mockReturnValue(of({ views: [draft] }));

      service
        .commitDraft(mockGridId, mockColumnDefs, mockAppName)
        .subscribe((result) => {
          expect(result.committed).toBe(false);
          expect(result.draftView?.id).toBe('draft-id');
          done();
        });
    });

    it('should throw when no draft exists', (done) => {
      iprefService.getPrefValue.mockReturnValue(
        of({ views: [{ ...mockView }] }),
      );

      service.commitDraft(mockGridId, mockColumnDefs, mockAppName).subscribe({
        error: (err) => {
          expect(err.message).toContain('No draft view found');
          done();
        },
      });
    });
  });

  describe('loadViews — draft auto-selection', () => {
    it('should always select the draft view on load when one exists', (done) => {
      const draft: GridViewModel = {
        ...mockView,
        id: 'draft-id',
        isDraft: true,
        draftSourceViewId: mockView.id,
        isSelected: false, // stored as false, but should be forced true
      };
      iprefService.getPrefValue.mockReturnValue(
        of({ views: [{ ...mockView, isSelected: true }, draft] }),
      );

      service
        .loadViews(mockGridId, mockColumnDefs, mockAppName)
        .subscribe((views) => {
          const selected = views.find((v) => v.isSelected);
          expect(selected?.id).toBe('draft-id');
          done();
        });
    });
  });

  describe('createView — draft excluded from MAX_VIEWS', () => {
    it('should allow creating a view even when drafts fill the array up to MAX_VIEWS', (done) => {
      const draft: GridViewModel = {
        ...mockView,
        id: 'draft-id',
        isDraft: true,
        draftSourceViewId: mockView.id,
      };
      // MAX_VIEWS - 1 real views + 1 draft = MAX_VIEWS total, but should still allow creation
      const realViews = Array(GRID_VIEW_CONSTRAINTS.MAX_VIEWS - 1)
        .fill(null)
        .map((_, i) => ({
          ...mockView,
          id: `view-${i}`,
          name: `View ${i}`,
        }));
      iprefService.getPrefValue.mockReturnValue(
        of({ views: [...realViews, draft] }),
      );
      iprefService.savePref.mockReturnValue(of(undefined));

      service
        .createView(
          mockGridId,
          {
            name: 'Brand New',
            isDefault: false,
            isSelected: true,
            gridState: mockGridState,
          },
          mockColumnDefs,
          mockAppName,
        )
        .subscribe((newView) => {
          expect(newView.name).toBe('Brand New');
          done();
        });
    });
  });
});
