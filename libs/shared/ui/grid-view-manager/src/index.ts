// Models
export type { GridViewModel, GridViewState as GridViewModelState, ColumnState } from './lib/models/grid-view.model';
export type {
  GridViewPreferenceConfig,
  GridViewPreferenceData,
  ViewDialogData,
} from './lib/models/grid-view-state.model';
export { GRID_VIEW_CONSTRAINTS } from './lib/models/grid-view-state.model';

// Grid State utilities
export type { CustomGridState } from './lib/data-access/grid-state/gridState';
export {
  sanitizeGridState,
  applyGridStateHelper,
  areGridStatesEqual,
  getEmptyGridState,
} from './lib/data-access/grid-state/grid-state.utils';

// Default views
export type { AppDefaultView, SharedDefaultView } from './lib/data-access/defaults/default-views.types';
export { appDefaultViewsMap } from './lib/data-access/defaults/app-default-views.config';
export { sharedDefaultViews } from './lib/data-access/defaults/shared-default-views.config';
export {
  getDefaultViewForApp,
  getSharedViewsForApp,
  getAllDefaultViewsForApp,
  hasDefaultViewForApp,
  hasAnyDefaultViewsForApp,
} from './lib/data-access/defaults/default-views.utils';
export { default as defaultViewsData } from './lib/data-access/defaults/default-views.utils';

// Services
export { GridDefaultsConfigService } from './lib/data-access/services/grid-defaults-config.service';
export { GridViewStorageService } from './lib/data-access/services/grid-view-storage.service';
export { GridViewService } from './lib/data-access/services/grid-view.service';
export { createDefaultView } from './lib/data-access/services/util/create-default-view.util';

// State store (signals-based)
export { GridViewStore } from './lib/state/grid-view.store';
export type {
  GridViewState,
  CommitDraftSaveAsNewPayload,
} from './lib/state/grid-view.store';

// Edit session
export { GridEditSessionService } from './lib/services/grid-edit-session.service';
export type { GridChangeOrigin } from './lib/services/grid-edit-session.service';

// Facade
export { GridViewHeaderFacadeService } from './lib/facade/grid-view-header-facade.service';

// Feature directive
export { GridViewManagerDirective } from './lib/feature/grid-view-manager.directive';
export type { AgGridHostInterface } from './lib/feature/grid-view-manager.directive';

// UI Components
export { GridViewHeaderComponent } from './lib/ui/grid-view-header/grid-view-header.component';
export type { GridHostRef } from './lib/ui/grid-view-header/grid-view-header.component';
export { HEADER_ICONS } from './lib/ui/grid-view-header/grid-view-icons';
export type { HeaderIcons } from './lib/ui/grid-view-header/grid-view-icons';
export { Icon } from './lib/ui/grid-view-header/icon.enum';
export { ViewDialogComponent } from './lib/ui/view-dialog/view-dialog.component';
export { ViewDropdownComponent } from './lib/ui/view-dropdown/view-dropdown.component';
export { HdsIconComponent } from './lib/ui/shared/hds-icon/hds-icon.component';
