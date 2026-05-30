import { GridViewModel } from '../../../models/grid-view.model';
import { v4 as uuidv4 } from 'uuid';
import { GridState } from '@ag-grid-community/core';
import {
  sanitizeGridState,
  getEmptyGridState,
} from '../../grid-state/grid-state.utils';

/**
 * Utility to create a default system view
 */
export function createDefaultView(validColIds: Set<string>): GridViewModel[] {
  const now = new Date();
  return [
    {
      id: uuidv4(),
      name: 'Default View',
      description: 'System default view',
      isDefault: true,
      isSelected: true,
      gridState: sanitizeGridState(
        getEmptyGridState(),
        validColIds,
      ) as GridState,
      createdAt: now,
      updatedAt: now,
    },
  ];
}
