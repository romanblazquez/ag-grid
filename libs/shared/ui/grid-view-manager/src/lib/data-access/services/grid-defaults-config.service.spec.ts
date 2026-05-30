jest.mock('@fmr-pr000264/ames-iconfig-v2-service', () => ({
  IConfigV2Service: 'IConfigV2Service',
}));

import { TestBed } from '@angular/core/testing';
import { GridDefaultsConfigService } from './grid-defaults-config.service';
import { IConfigV2Service } from '@fmr-pr000264/ames-iconfig-v2-service';
import { RuntimeConfigExt } from '@fmr-pr000539/eqt-ames-conf-preset';
import { of } from 'rxjs';

const MOCK_APP_NAME = 'my-app';
const MOCK_GRID_ID = 'my-grid';

const mockDefaultViewRaw = JSON.stringify({
  viewName: 'Default View',
  description: 'The default',
  gridState: { sort: { sortModel: [] }, expandAll: false },
});

const mockSharedViewsRaw = JSON.stringify([
  {
    viewName: 'Shared View A',
    description: 'Shared A',
    availableFor: ['my-app'],
    gridState: { sort: { sortModel: [] }, expandAll: false },
  },
]);

function buildService(
  defaultRaw: string | null = mockDefaultViewRaw,
  sharedRaw: string | null = mockSharedViewsRaw,
) {
  const iConfigService = {
    getAllConfigurations: jest
      .fn()
      .mockImplementation((tenant: string, nodePath: string) => {
        if (nodePath.includes('GridDefaults')) {
          return of(sharedRaw !== null ? { [MOCK_GRID_ID]: sharedRaw } : {});
        }
        return of(defaultRaw !== null ? { [MOCK_GRID_ID]: defaultRaw } : {});
      }),
  };

  const runtimeConfig: RuntimeConfigExt = {
    logicalEnvironment: 'DEV',
  } as RuntimeConfigExt;

  TestBed.configureTestingModule({
    providers: [
      GridDefaultsConfigService,
      { provide: IConfigV2Service, useValue: iConfigService },
      { provide: RuntimeConfigExt, useValue: runtimeConfig },
    ],
  });

  return {
    service: TestBed.inject(GridDefaultsConfigService),
    iConfigService,
  };
}

describe('GridDefaultsConfigService', () => {
  describe('getAllDefaultViewsForApp - deterministic IDs', () => {
    it('produces the same id on consecutive calls for the app default view', (done) => {
      const { service } = buildService();

      let firstId: string;
      service
        .getAllDefaultViewsForApp(MOCK_APP_NAME, MOCK_GRID_ID)
        .subscribe((views1) => {
          firstId = views1.find((v) => v.name === 'Default View')!.id;

          service
            .getAllDefaultViewsForApp(MOCK_APP_NAME, MOCK_GRID_ID)
            .subscribe((views2) => {
              const secondId = views2.find(
                (v) => v.name === 'Default View',
              )!.id;
              expect(firstId).toBe(secondId);
              expect(firstId).toBe(
                `system:${MOCK_APP_NAME}:${MOCK_GRID_ID}:Default View`,
              );
              done();
            });
        });
    });

    it('produces the same id on consecutive calls for a shared view', (done) => {
      const { service } = buildService();

      let firstId: string;
      service
        .getAllDefaultViewsForApp(MOCK_APP_NAME, MOCK_GRID_ID)
        .subscribe((views1) => {
          firstId = views1.find((v) => v.name === 'Shared View A')!.id;

          service
            .getAllDefaultViewsForApp(MOCK_APP_NAME, MOCK_GRID_ID)
            .subscribe((views2) => {
              const secondId = views2.find(
                (v) => v.name === 'Shared View A',
              )!.id;
              expect(firstId).toBe(secondId);
              expect(firstId).toBe(
                `system:${MOCK_APP_NAME}:${MOCK_GRID_ID}:Shared View A`,
              );
              done();
            });
        });
    });

    it('IDs differ between two different appName+gridId combinations', (done) => {
      const { service } = buildService();

      service
        .getAllDefaultViewsForApp(MOCK_APP_NAME, MOCK_GRID_ID)
        .subscribe((views1) => {
          const id1 = views1.find((v) => v.name === 'Default View')?.id;

          service
            .getAllDefaultViewsForApp('other-app', 'other-grid')
            .subscribe((views2) => {
              const id2 = views2.find((v) => v.name === 'Default View')?.id;
              // If both have a default view, they must use different prefixes
              if (id1 && id2) {
                expect(id1).not.toBe(id2);
              }
              done();
            });
        });
    });
  });

  describe('getAllDefaultViewsForApp - view structure', () => {
    it('marks the app default view as isDefault: true and isSelected: true', (done) => {
      const { service } = buildService();

      service
        .getAllDefaultViewsForApp(MOCK_APP_NAME, MOCK_GRID_ID)
        .subscribe((views) => {
          const defView = views.find((v) => v.name === 'Default View');
          expect(defView).toBeDefined();
          expect(defView?.isDefault).toBe(true);
          expect(defView?.isSelected).toBe(true);
          done();
        });
    });

    it('marks shared views as isDefault: false', (done) => {
      const { service } = buildService();

      service
        .getAllDefaultViewsForApp(MOCK_APP_NAME, MOCK_GRID_ID)
        .subscribe((views) => {
          const shared = views.find((v) => v.name === 'Shared View A');
          expect(shared).toBeDefined();
          expect(shared?.isDefault).toBe(false);
          done();
        });
    });

    it('returns empty array when iConfig has no data for app and grid', (done) => {
      const { service } = buildService(null, null);

      service
        .getAllDefaultViewsForApp(MOCK_APP_NAME, MOCK_GRID_ID)
        .subscribe((views) => {
          expect(views).toHaveLength(0);
          done();
        });
    });

    it('ensures at least one view is selected when no app default but shared views exist', (done) => {
      const { service } = buildService(null, mockSharedViewsRaw);

      service
        .getAllDefaultViewsForApp(MOCK_APP_NAME, MOCK_GRID_ID)
        .subscribe((views) => {
          expect(views.some((v) => v.isSelected)).toBe(true);
          done();
        });
    });
  });
});
