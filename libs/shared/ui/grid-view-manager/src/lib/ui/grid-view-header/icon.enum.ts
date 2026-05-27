/**
 * Local stub replacing the Icon enum from the proprietary
 * @fmr-pr000539/eqt-common-grid package.
 *
 * The values are intentional string literals so that consuming code
 * can compare them with the `hideIcons` input array.
 */
export enum Icon {
  SAVE_GRID = 'SAVE_GRID',
  EXPORT_DATA = 'EXPORT_DATA',
  CLEAR_FILTERS = 'CLEAR_FILTERS',
  REMOVE_SORT = 'REMOVE_SORT',
  EXPAND_COLLAPSE = 'EXPAND_COLLAPSE',
  REFRESH = 'REFRESH',
}
