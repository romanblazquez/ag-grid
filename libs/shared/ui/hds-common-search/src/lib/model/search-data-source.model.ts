import { Observable } from 'rxjs';
import { AbstractData } from './search-result.model';
import { TreeNode } from './tree-node.model';

/**
 * Callback signature for fetching search suggestions.
 * Consumer provides this function — the component calls it on each query.
 *
 * @param query - The user's typed search text
 * @returns Observable of results (flat array for grid view, TreeNode[] for tree view)
 */
export type SearchDataSourceFn = (
  query: string,
) => Observable<AbstractData[] | TreeNode[]>;

/**
 * Callback for fetching initial/default data shown on dropdown open.
 * Optional — when omitted, the component calls `dataSourceFn('')`.
 */
export type SearchInitialDataFn = () => Observable<AbstractData[] | TreeNode[]>;
