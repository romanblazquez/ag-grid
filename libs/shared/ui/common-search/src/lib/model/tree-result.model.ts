export interface TreeNode {
  children?: TreeNode[];
  items: Array<Item>;
  header: boolean;
}

/** Flat to-do item node with expandable and level information */
export class TreeFlatNode {
  public constructor(
    public id: string,
    public items: Array<Item>,
    public level: number,
    public expandable: boolean,
    public header: boolean,
    public visibleItems: Array<Item>,
    public disabled = false,
  ) {}
}

export interface Item {
  name: string;
  value: unknown;
  visible?: boolean;
}
