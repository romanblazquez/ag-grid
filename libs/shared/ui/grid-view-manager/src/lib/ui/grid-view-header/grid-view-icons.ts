import { HdsIconName } from '@fmr-pr000264/hds-core-icons';

export const HEADER_ICONS = {
  export: 'hds-download',
  expandAll: 'hds-chevron-down',
  collapseAll: 'hds-chevron-up',
  refresh: 'hds-refresh-data',
  history: 'hds-history',
  save: 'hds-save',
  addNew: 'hds-add-new-item',
  filterFilled: 'hds-filter-filled',
  filterUnfilled: 'hds-filter',
  sortOrdered: 'hds-list-ordered',
  sortUnordered: 'hds-list-unordered',
} as const satisfies Record<string, HdsIconName>;

export type HeaderIcons = typeof HEADER_ICONS;
