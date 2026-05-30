import { SearchType } from './search-type.enum';
import { SearchDataSourceFn, SearchInitialDataFn } from './search-data-source.model';
import { TreeFlatNode, TreeNode } from './tree-node.model';

export interface DetailField {
  name: string;
  visible: boolean;
}

export interface Context {
  searchType: string;
  placeholder: string;
  emitField: string;
  /** Field name whose value is shown as chip text. Falls back to
   *  `detailFields[0].name` then `emitField` when omitted. */
  chipDisplayField?: string;
  detailFields: DetailField[];
  detailHeaders: string[];
  fieldWidths: Record<string, number>;
  panelWidth?: number;
  isTreeView?: boolean;
  multiselect?: boolean;
  initLoadData?: boolean;
  errorMessage?: string;
}

export interface SearchContext {
  searchType: string;
  overrideContext?: Partial<Context>;
  disableRules?: {
    grid?: (row: { data: unknown; selected: boolean }) => boolean;
    tree?: (node: TreeNode | TreeFlatNode) => boolean;
  };
  /**
   * Consumer-provided search function. When set, the component calls this
   * directly instead of going through the DataAccessFacadeService registry.
   * This is the fastest path — no DI resolution, no service lookup.
   */
  dataSourceFn?: SearchDataSourceFn;
  /**
   * Optional function for initial/dropdown data. When omitted and
   * `dataSourceFn` is set, the component calls `dataSourceFn('')`.
   */
  initialDataFn?: SearchInitialDataFn;
}

/**
 * @deprecated Use string literal types for searchType instead.
 * Kept for backward compatibility with existing trade-search consumers.
 */
export { SearchType };
