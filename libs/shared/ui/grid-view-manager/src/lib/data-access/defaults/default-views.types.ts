import { GridState } from 'ag-grid-community';

/**
 * App-specific default view configurations
 */
export interface AppDefaultView {
  appName: string;
  viewName: string;
  description: string;
  gridState: GridState;
}

/**
 * Shared default views available across multiple apps
 */
export interface SharedDefaultView {
  viewName: string;
  description: string;
  availableFor: string[]; // List of app names this view is available for
  gridState: GridState;
}
