import { SearchType } from './search-type.model';
import { TreeNode } from './tree-result.model';
import { MultiselectData } from '../ui/grid-view-result/grid-view-result.component';
import { Context } from './context.model';

export interface SearchContext {
  searchType: SearchType;
  disableRules?: {
    tree?: (node: TreeNode) => boolean;
    grid?: (node: MultiselectData) => boolean;
  };
  overrideContext?: Partial<Context>;
}
