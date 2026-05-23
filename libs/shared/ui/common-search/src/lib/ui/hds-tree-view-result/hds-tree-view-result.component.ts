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

  /** Programmatic entry point used by the parent when the user presses
   * ArrowDown from the input — moves focus to the first tree row, after
   * which PrimeNG's `p-tree` handles arrows / space / enter natively. */
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
      // PrimeNG's tree-node keydown lets Tab fall through to the browser,
      // which would either trap focus inside the body-appended overlay or
      // jump somewhere unrelated. Hijack here and let the parent decide
      // which form control to focus next.
      event.preventDefault();
      this.tabOut.emit(event.shiftKey);
    }
  }

  constructor() {
    effect(() => {
      this.valueToNodeMap.clear();
      const emitKey = this.emitField();
      const disable = this.disableSelected();
      const preKeys = new Set(
        this.preSelected().map((d) => d[emitKey] as string),
      );
      const nodes = this.searchResults().flatMap((n) =>
        this.toPrimeNodes(n, 0, preKeys, emitKey, disable),
      );
      untracked(() => {
        this.treeNodes.set(nodes);
        if (preKeys.size > 0) {
          const restored: PrimeTreeNode[] = [];
          this.valueToNodeMap.forEach((node) => {
            if (node.children?.length) return;
            const d = node.data as Record<string, unknown> | undefined;
            if (d && preKeys.has(d[emitKey] as string)) restored.push(node);
          });
          this.selectedNodes.set(restored);
        } else {
          this.selectedNodes.set([]);
        }
      });
    });

    effect(() => {
      const clear = this.clearSelection();
      if (clear) this.selectedNodes.set([]);
    });

    effect(() => {
      const toggle = this.autoToggle();
      if (toggle?.deselect) {
        const norm = toggle.deselect.replace(/\s/g, '').toUpperCase();
        const node = this.valueToNodeMap.get(norm);
        if (node) {
          this.selectedNodes.update((sel) => sel.filter((n) => n !== node));
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

    // PrimeNG's `propagateSelectionDown` sweeps every descendant when a
    // parent is toggled, ignoring `selectable: false`. Drop rule-disabled
    // leaves so a parent click can't smuggle them in, but keep
    // pre-selected-disabled leaves (already shown as chips — those stay
    // committed regardless of what propagation does).
    const filtered = arr.filter((n) => {
      if (n.selectable !== false) return true;
      if (n.children?.length) return false;
      const d = n.data as Record<string, unknown> | undefined;
      const key = d?.[emitKey] as string | undefined;
      return key !== undefined && preKeys.has(key);
    });

    this.selectedNodes.set(filtered);

    const primaryField = this.detailFields()[0]?.name;
    const data: Record<string, unknown>[] = [];
    const values: CommonSearchValue[] = [];
    const displayText: string[] = [];

    for (const n of filtered) {
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

  private toPrimeNodes(
    node: TreeNode,
    level: number,
    preKeys: Set<string>,
    emitKey: string,
    disable: boolean,
  ): PrimeTreeNode[] {
    if (node.header) {
      return (
        node.children?.flatMap((c) =>
          this.toPrimeNodes(c, level, preKeys, emitKey, disable),
        ) ?? []
      );
    }

    const visibleItems = node.items.filter((i) => i.visible !== false);
    const data = Object.fromEntries(
      node.items.map((i) => [i.name, i.value]),
    ) as Record<string, unknown>;
    const isPreSelected = preKeys.has(data[emitKey] as string);
    const children =
      node.children?.flatMap((c) =>
        this.toPrimeNodes(c, level + 1, preKeys, emitKey, disable),
      ) ?? [];
    const allChildrenDisabled =
      children.length > 0 && children.every((c) => c.selectable === false);
    const ruleDisabled = this.disableRule()(node);
    const shouldDisable =
      ruleDisabled ||
      (disable && (children.length > 0 ? allChildrenDisabled : isPreSelected));
    const primeNode: PrimeTreeNode = {
      label:
        (visibleItems.find((i) => i.name === this.displayField())
          ?.value as string) ?? (visibleItems[0]?.value as string),
      data,
      selectable: !shouldDisable,
      styleClass: shouldDisable ? 'hds-tree-disabled-row' : undefined,
      children,
      expanded: children.length > 0,
    };

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
