export interface Item {
  name: string;
  value: unknown;
  visible?: boolean;
}

export interface TreeNode {
  items: Item[];
  children?: TreeNode[];
  header?: boolean;
}

export interface TreeFlatNode {
  items: Item[];
  level: number;
  expandable: boolean;
}
