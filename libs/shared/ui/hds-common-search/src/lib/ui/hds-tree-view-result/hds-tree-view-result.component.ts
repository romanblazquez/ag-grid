import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { TreeModule } from 'primeng/tree';
import { TreeNode as PrimeTreeNode } from 'primeng/api';
import { NgStyle } from '@angular/common';
import {
  CommonSearchSelection,
  CommonSearchValue,
} from '../../model/search-result.model';
import { TreeNode } from '../../model/tree-node.model';
import { DetailField } from '../../model/search-context.model';
import { AutoToggle } from '../../model/auto-toggle.interface';
import { HdsSelectedChipsListComponent } from '../hds-selected-chips-list/hds-selected-chips-list.component';

@Component({
  selector: 'lib-hds-tree-view-result',
  templateUrl: './hds-tree-view-result.component.html',
  styleUrls: ['./hds-tree-view-result.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TreeModule, NgStyle, HdsSelectedChipsListComponent],
})
export class HdsTreeViewResultComponent {
  readonly searchResults = input<TreeNode[]>([]);
  readonly detailFields = input<DetailField[]>([]);
  readonly displayField = input<string>('');
  readonly emitField = input<string>('');
  readonly chipDisplayField = input<string | undefined>(undefined);
  readonly headers = input<string[]>([]);
  readonly fieldWidths = input<Record<string, number>>({});
  readonly autoToggle = input<AutoToggle | undefined>(undefined);
  readonly clearSelection = input<object | undefined>(undefined);
  readonly disableRule = input<(node: TreeNode) => boolean>(() => false);
  readonly disableSelected = input<boolean>(true);
  readonly preSelected = input<Record<string, unknown>[]>([]);
  readonly query = input<string>('');
  readonly maxSelectedRows = input<number>(0);

  readonly selected = output<CommonSearchSelection>();
  readonly chipRemoved = output<string>();
  readonly escape = output<void>();
  readonly tabOut = output<boolean>();

  readonly treeNodes = signal<PrimeTreeNode[]>([]);
  readonly selectedNodes = signal<PrimeTreeNode[]>([]);

  private readonly treeHost = viewChild('treeHost', {
    read: ElementRef,
  });

  get selectedNodesValue(): PrimeTreeNode[] {
    return this.selectedNodes();
  }
  set selectedNodesValue(v: PrimeTreeNode[] | PrimeTreeNode | null) {
    const arr = Array.isArray(v) ? v : v ? [v] : [];
    this.selectedNodes.set(arr);
  }

  readonly resultCount = computed(() => this.countLeaves(this.treeNodes()));
  readonly formattedResultCount = computed(() =>
    this.resultCount().toLocaleString('en-US'),
  );
  readonly visibleFields = computed(() =>
    this.detailFields().filter((f) => f.visible !== false),
  );
  readonly headerLabels = computed(() =>
    this.visibleFields().map((f, i) => this.headers()[i] ?? f.name),
  );

  private readonly valueToNodeMap = new Map<string, PrimeTreeNode>();

  focusFirstNode(): void {
    const host = this.treeHost()?.nativeElement as HTMLElement | undefined;
    if (!host) return;
    const first = host.querySelector<HTMLElement>('[role="treeitem"]');
    first?.focus();
  }

  onTreeKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.escape.emit();
      return;
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      this.tabOut.emit(event.shiftKey);
    }
  }

  constructor() {
    // Build tree structure only when search results change
    effect(() => {
      this.valueToNodeMap.clear();
      const emitKey = this.emitField();
      const disable = this.disableSelected();
      const preKeys = new Set(
        untracked(() => this.preSelected()).map((d) => d[emitKey] as string),
      );
      const nodes = this.searchResults().flatMap((n) =>
        this.toPrimeNodes(n, null, preKeys, emitKey, disable),
      );
      untracked(() => {
        this.treeNodes.set(nodes);
        if (preKeys.size > 0) {
          const restoredLeaves: PrimeTreeNode[] = [];
          this.valueToNodeMap.forEach((node) => {
            if (node.children?.length) return;
            const d = node.data as Record<string, unknown> | undefined;
            if (d && preKeys.has(d[emitKey] as string))
              restoredLeaves.push(node);
          });
          const reconciled = this.reconcileSelection(
            nodes,
            new Set(restoredLeaves),
          );
          this.selectedNodes.set(reconciled);
        } else {
          this.selectedNodes.set([]);
        }
      });
    });

    // Sync selectedNodes to MIRROR preSelected exactly when it changes.
    // preSelected is the source of truth from the parent (chips list); when
    // a chip is removed there, this effect must DROP the corresponding tree
    // node from selectedNodes, not just add new ones. The previous version
    // unioned currentLeaves ∪ matchedLeaves which only added — removed
    // chips left their checkbox stuck checked.
    effect(() => {
      const pre = this.preSelected();
      const emitKey = untracked(() => this.emitField());
      const disable = untracked(() => this.disableSelected());
      const nodes = untracked(() => this.treeNodes());
      if (!nodes.length) return;
      const preKeys = new Set(pre.map((d) => d[emitKey] as string));
      this.updateDisabledState(nodes, preKeys, emitKey, disable);

      // Build the EXACT leaf set from preSelected (no merging with current).
      const matchedLeaves: PrimeTreeNode[] = [];
      if (preKeys.size > 0) {
        this.valueToNodeMap.forEach((node) => {
          if (node.children?.length) return;
          const d = node.data as Record<string, unknown> | undefined;
          if (d && preKeys.has(d[emitKey] as string))
            matchedLeaves.push(node);
        });
      }
      const reconciled = this.reconcileSelection(
        nodes,
        new Set(matchedLeaves),
      );
      untracked(() => this.selectedNodes.set(reconciled));
    });

    effect(() => {
      const clear = this.clearSelection();
      if (clear) {
        this.selectedNodes.set([]);
        this.clearPartialState(this.treeNodes());
      }
    });

    effect(() => {
      const toggle = this.autoToggle();
      if (toggle?.deselect) {
        const norm = toggle.deselect.replace(/\s/g, '').toUpperCase();
        const node = this.valueToNodeMap.get(norm);
        if (node) {
          const currentLeaves = untracked(() => this.selectedNodes()).filter(
            (n) => !n.children?.length && n !== node,
          );
          const reconciled = this.reconcileSelection(
            untracked(() => this.treeNodes()),
            new Set(currentLeaves),
          );
          this.selectedNodes.set(reconciled);
        }
      }
    });
  }

  onSelectionChange(
    nodes: PrimeTreeNode | PrimeTreeNode[] | null | undefined,
  ): void {
    const arr = Array.isArray(nodes) ? nodes : nodes ? [nodes] : [];

    const emitKey = this.emitField();
    const preKeys = new Set(
      this.preSelected().map((d) => d[emitKey] as string),
    );

    // Filter out rule-disabled leaves that propagation smuggled in,
    // but keep pre-selected-disabled leaves (already committed as chips).
    const needsFilter = arr.some((n) => n.selectable === false);
    const effective = needsFilter
      ? arr.filter((n) => {
          if (n.selectable !== false) return true;
          if (n.children?.length) return false;
          const d = n.data as Record<string, unknown> | undefined;
          const key = d?.[emitKey] as string | undefined;
          return key !== undefined && preKeys.has(key);
        })
      : arr;

    // Extract only leaf nodes from PrimeNG's selection for reconciliation.
    // PrimeNG may include parents in its array; we recompute parent state ourselves.
    const leaves = effective.filter((n) => !n.children?.length);
    const reconciled = this.reconcileSelection(
      this.treeNodes(),
      new Set(leaves),
    );
    this.selectedNodes.set(reconciled);

    const primaryField =
      this.chipDisplayField() ?? this.detailFields()[0]?.name;
    const data: Record<string, unknown>[] = [];
    const values: CommonSearchValue[] = [];
    const displayText: string[] = [];

    for (const n of effective) {
      if (n.children?.length) continue;
      const d = n.data as Record<string, unknown>;
      const rawEmitVal = d[emitKey];
      if (typeof rawEmitVal !== 'string' && typeof rawEmitVal !== 'number') {
        continue;
      }
      const emitVal = rawEmitVal;
      const primary = primaryField ? (d[primaryField] as string) : '';
      data.push(d);
      values.push(emitVal);
      displayText.push(primary?.length > 0 ? primary : `${emitVal}`);
    }

    this.selected.emit({ data, values, displayText });
  }

  /**
   * Reconcile the selection array: walk the tree bottom-up and:
   * - If ALL children of a parent are selected → add parent to selection,
   *   set partialSelected = false (AG Grid: fully checked parent)
   * - If SOME children are selected → set partialSelected = true,
   *   do NOT add parent to selection (AG Grid: indeterminate dash)
   * - If NONE → partialSelected = false, not in selection
   *
   * Returns the reconciled selection array (leaves + fully-selected parents).
   */
  private reconcileSelection(
    nodes: PrimeTreeNode[],
    leafSelection: Set<PrimeTreeNode>,
  ): PrimeTreeNode[] {
    const result: PrimeTreeNode[] = [];
    const resultSet = new Set<PrimeTreeNode>();
    this.reconcileNodes(nodes, leafSelection, result, resultSet);
    return result;
  }

  private reconcileNodes(
    nodes: PrimeTreeNode[],
    leafSelection: Set<PrimeTreeNode>,
    result: PrimeTreeNode[],
    resultSet: Set<PrimeTreeNode>,
  ): boolean {
    let allSelected = true;
    let anySelected = false;

    for (const node of nodes) {
      if (node.children?.length) {
        const childrenAllSelected = this.reconcileNodes(
          node.children,
          leafSelection,
          result,
          resultSet,
        );
        const childrenAnySelected = node.children.some(
          (c) =>
            c.partialSelected ||
            resultSet.has(c) ||
            leafSelection.has(c),
        );

        if (childrenAllSelected) {
          node.partialSelected = false;
          result.push(node);
          resultSet.add(node);
          anySelected = true;
        } else if (childrenAnySelected) {
          node.partialSelected = true;
          anySelected = true;
          allSelected = false;
        } else {
          node.partialSelected = false;
          allSelected = false;
        }
      } else {
        if (leafSelection.has(node)) {
          result.push(node);
          resultSet.add(node);
          anySelected = true;
        } else {
          allSelected = false;
        }
      }
    }

    return allSelected && anySelected;
  }

  private clearPartialState(nodes: PrimeTreeNode[]): void {
    for (const n of nodes) {
      n.partialSelected = false;
      if (n.children?.length) this.clearPartialState(n.children);
    }
  }

  private updateDisabledState(
    nodes: PrimeTreeNode[],
    preKeys: Set<string>,
    emitKey: string,
    disable: boolean,
  ): void {
    for (const node of nodes) {
      if (node.children?.length) {
        this.updateDisabledState(node.children, preKeys, emitKey, disable);
        const allChildrenDisabled = node.children.every(
          (c) => c.selectable === false,
        );
        const shouldDisable = disable && allChildrenDisabled;
        node.selectable = !shouldDisable;
        node.styleClass = shouldDisable ? 'hds-tree-disabled-row' : '';
      } else {
        const d = node.data as Record<string, unknown> | undefined;
        const key = d?.[emitKey] as string | undefined;
        const isPreSelected = key !== undefined && preKeys.has(key);
        const items = d
          ? Object.entries(d).map(([name, value]) => ({ name, value }))
          : [];
        const ruleDisabled = this.disableRule()({ items } as TreeNode);
        const shouldDisable = ruleDisabled || (disable && isPreSelected);
        node.selectable = !shouldDisable;
        node.styleClass = shouldDisable ? 'hds-tree-disabled-row' : '';
      }
    }
  }

  private toPrimeNodes(
    node: TreeNode,
    parentRef: PrimeTreeNode | null,
    preKeys: Set<string>,
    emitKey: string,
    disable: boolean,
  ): PrimeTreeNode[] {
    if (node.header) {
      return (
        node.children?.flatMap((c) =>
          this.toPrimeNodes(c, parentRef, preKeys, emitKey, disable),
        ) ?? []
      );
    }

    const visibleItems = node.items.filter((i) => i.visible !== false);
    const data = Object.fromEntries(
      node.items.map((i) => [i.name, i.value]),
    ) as Record<string, unknown>;
    const isPreSelected = preKeys.has(data[emitKey] as string);
    const primeNode: PrimeTreeNode = {
      label:
        (visibleItems.find((i) => i.name === this.displayField())
          ?.value as string) ?? (visibleItems[0]?.value as string),
      data,
      selectable: true,
      children: [],
      expanded: true,
      parent: parentRef ?? undefined,
    };

    const children =
      node.children?.flatMap((c) =>
        this.toPrimeNodes(c, primeNode, preKeys, emitKey, disable),
      ) ?? [];
    primeNode.children = children;
    primeNode.expanded = children.length > 0;

    const allChildrenDisabled =
      children.length > 0 && children.every((c) => c.selectable === false);
    const ruleDisabled = this.disableRule()(node);
    const shouldDisable =
      ruleDisabled ||
      (disable && (children.length > 0 ? allChildrenDisabled : isPreSelected));
    if (shouldDisable) {
      primeNode.selectable = false;
      primeNode.styleClass = 'hds-tree-disabled-row';
    }

    for (const item of visibleItems) {
      const norm = `${item.value}`.replace(/\s/g, '').toUpperCase();
      if (norm) this.valueToNodeMap.set(norm, primeNode);
    }

    return [primeNode];
  }

  private countLeaves(nodes: PrimeTreeNode[]): number {
    let count = 0;
    for (const n of nodes) {
      if (n.children && n.children.length > 0)
        count += this.countLeaves(n.children);
      else count += 1;
    }
    return count;
  }
}
