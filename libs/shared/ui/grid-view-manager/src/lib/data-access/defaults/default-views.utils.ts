import { GridState } from 'ag-grid-community';
import { v4 as uuidv4 } from 'uuid';
import { GridViewModel } from '../../models/grid-view.model';
import { appDefaultViewsMap } from './app-default-views.config';
import { sharedDefaultViews } from './shared-default-views.config';

/**
 * Get default view for a specific app
 */
export function getDefaultViewForApp(
  appName: string | undefined,
): GridViewModel | null {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!appName || !appDefaultViewsMap[appName]) {
    return null;
  }

  const config = appDefaultViewsMap[appName];
  const now = new Date();

  return {
    id: uuidv4(),
    name: config.viewName,
    description: config.description,
    isDefault: false,
    isSelected: true,
    gridState: config.gridState,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Get all shared views available for a specific app
 */
export function getSharedViewsForApp(
  appName: string | undefined,
): GridViewModel[] {
  if (!appName) {
    return [];
  }

  const now = new Date();
  return sharedDefaultViews
    .filter((view) => view.availableFor.includes(appName))
    .map((view) => ({
      id: uuidv4(),
      name: view.viewName,
      description: view.description,
      isDefault: false,
      isSelected: false,
      gridState: view.gridState,
      createdAt: now,
      updatedAt: now,
    }));
}

/**
 * Get all default views (app-specific + shared) for a specific app
 */
export function getAllDefaultViewsForApp(
  appName: string | undefined,
): GridViewModel[] {
  const views: GridViewModel[] = [];

  // Add app-specific default view if exists
  const appView = getDefaultViewForApp(appName);
  if (appView) {
    views.push(appView);
  }

  // Add shared views
  const sharedViews = getSharedViewsForApp(appName);
  views.push(...sharedViews);

  return views;
}

/**
 * Check if an app has a predefined default view
 */
export function hasDefaultViewForApp(appName: string | undefined): boolean {
  return !!appName && !!appDefaultViewsMap[appName];
}

/**
 * Check if an app has any default views (app-specific or shared)
 */
export function hasAnyDefaultViewsForApp(appName: string | undefined): boolean {
  if (!appName) return false;
  return (
    hasDefaultViewForApp(appName) ||
    sharedDefaultViews.some((view) => view.availableFor.includes(appName))
  );
}

const defaultViewsData: GridViewModel[] = [
  {
    id: 'default123',
    name: 'Default',
    isDefault: true,
    isSelected: false,
    gridState: {} as GridState,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export default defaultViewsData;
