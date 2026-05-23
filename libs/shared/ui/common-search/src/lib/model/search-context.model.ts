import { SearchType } from './search-type.enum';
import { TreeFlatNode, TreeNode } from './tree-node.model';

export interface DetailField {
  name: string;
  visible: boolean;
}

export interface Context {
  searchType: SearchType;
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
  searchType: SearchType;
  overrideContext?: Partial<Context>;
  disableRules?: {
    grid?: (row: { data: unknown; selected: boolean }) => boolean;
    tree?: (node: TreeNode | TreeFlatNode) => boolean;
  };
}
