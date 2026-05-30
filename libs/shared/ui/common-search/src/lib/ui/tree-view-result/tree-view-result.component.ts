/* eslint-disable max-lines */
import { Observable } from 'rxjs';
import { SelectionModel } from '@angular/cdk/collections';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  NgZone,
  Output,
} from '@angular/core';
import {
  MatTreeFlatDataSource,
  MatTreeFlattener,
} from '@angular/material/tree';
import { FlatTreeControl } from '@angular/cdk/tree';
import { Item, TreeFlatNode, TreeNode } from '../../model/tree-result.model';
import { CommonSearchSelection } from '../../model/common-search-selection.interface';
import { AutoToggle } from '../../model/auto-toggle.interface';
import { CommonSearchStore } from '../../data-access/store/common-search.store';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { CommonSearchInteractionType } from '../../model/common-search-interaction-type.enum';

@Component({
  selector: 'fmr-pr000539-tree-view-result',
  templateUrl: './tree-view-result.component.html',
  styleUrls: ['./tree-view-result.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class TreeViewResultComponent {
  public treeControl = new FlatTreeControl<TreeFlatNode>(
    (n) => n.level,
    (n) => n.expandable,
  );
  public checklistSelection = new SelectionModel<string>(true /* multiple */);
  public autoSearchActive$!: Observable<boolean>;
  public autoSelect$!: Observable<string | null>;
  public autoSelectVal!: string | null;

  @Input() public fieldWidths!: Record<string, number>;
  @Input() public headers!: string[];
  @Input() public detailFields!: Array<{ name: string; visible: boolean }>;
  @Input() public displayField = '';
  @Input() public emitField = '';
  @Input() public disableRule?: (node: TreeFlatNode) => boolean = () => false;
  @Output() public selected = new EventEmitter<CommonSearchSelection>();

  // JSON for template use
  protected readonly JSON = JSON;

  // Efficient data structures
  public readonly nodeMap = new Map<string, TreeFlatNode>();
  private readonly parentMap = new Map<string, string>();
  private readonly descendantsMap = new Map<string, string[]>();
  private readonly valueToIdMap = new Map<string, string[]>();
  public isProcessing = false;

  // TreeFlattener and DataSource setup
  private readonly treeFlattener = new MatTreeFlattener(
    this.transformer.bind(this),
    (n: TreeFlatNode) => n.level,
    (n: TreeFlatNode) => n.expandable,
    (n: TreeNode) => n.children ?? [],
  );

  public dataSource = new MatTreeFlatDataSource(
    this.treeControl,
    this.treeFlattener,
  );

  public isTreeFlatNodeDisabled = (node: TreeFlatNode): boolean => {
    if (this.disableRule) {
      return this.disableRule(node);
    }
    return false;
  };

  public constructor(
    private readonly commonSearchStore: CommonSearchStore,
    private readonly zone: NgZone,
    private readonly cd: ChangeDetectorRef,
  ) {
    // Setup selection change handling with debounce
    this.checklistSelection.changed
      .pipe(takeUntilDestroyed(), debounceTime(50), distinctUntilChanged())
      .subscribe(() => this.emitSelection());

    // Track auto-select values
    this.autoSelect$
      .pipe(takeUntilDestroyed(), distinctUntilChanged())
      .subscribe((v) => (this.autoSelectVal = v));

    // Handle auto-selection
    this.autoSearchActive$
      .pipe(takeUntilDestroyed(), distinctUntilChanged())
      .subscribe((active) => {
        if (active && this.autoSelectVal) {
          this.batchAutoSelect(this.autoSelectVal.split(','));
        }
      });
  }

  @Input()
  public set searchResults(results: TreeNode[] | undefined | null) {
    if (this.isProcessing) return;
    this.isProcessing = true;

    // Reset data structures for new results
    this.nodeMap.clear();
    this.parentMap.clear();
    this.descendantsMap.clear();
    this.valueToIdMap.clear();

    // Process data outside Angular zone to prevent change detection cycles
    this.zone.runOutsideAngular(() => {
      // Set data or empty array
      this.dataSource.data = results || [];

      // Defer expansion to next tick
      setTimeout(() => {
        if (this.nodeMap.size < 1500) {
          this.treeControl.expandAll();
        }
        // Build relationship maps after expansion
        this.buildRelationshipMaps();
        this.isProcessing = false;
      });
    });
  }

  @Input()
  public set clearSelection(clear: any) {
    if (clear) {
      this.checklistSelection.clear();
    }
  }

  @Input()
  public set autoToggle(obj: AutoToggle | undefined) {
    if (obj?.deselect) {
      this.selectOrDeselect(obj.deselect, false);
    }
  }

  public transformer(node: TreeNode, level: number): TreeFlatNode {
    // Create unique ID for the node
    const id = `${level}:${node.header}:${node.items[0]?.value || ''}`;

    // Return cached node if available
    if (this.nodeMap.has(id)) {
      return this.nodeMap.get(id)!;
    }

    // Filter visible items
    const visibleItems = node.items.filter((i) => i.visible !== false);

    // Create new flat node
    const flatNode = new TreeFlatNode(
      id,
      node.items,
      level,
      !!node.children?.length,
      node.header,
      visibleItems,
    );

    // setting up disabled property in flatNode
    const isFlatNodeDisabled = this.isTreeFlatNodeDisabled(flatNode);
    flatNode.disabled = isFlatNodeDisabled;

    // Store only non-header nodes
    if (!node.header) {
      this.nodeMap.set(id, flatNode);

      // Index values for fast lookups
      for (const item of flatNode.items) {
        const normValue = this.normalizeValue(`${item.value}`);
        if (normValue) {
          if (!this.valueToIdMap.has(normValue)) {
            this.valueToIdMap.set(normValue, []);
          }
          this.valueToIdMap.get(normValue)!.push(id);
        }
      }
    }

    return flatNode;
  }

  // Node selection methods
  public selectOrDeselect(name: string, selectOnly: boolean): void {
    if (!name) return;
    const normalizedName = this.normalizeValue(name);
    const nodeIds = this.valueToIdMap.get(normalizedName) || [];
    this.zone.runOutsideAngular(() => {
      for (const id of nodeIds) {
        const node = this.nodeMap.get(id);
        if (node && !node.header) {
          if (selectOnly) {
            if (!this.checklistSelection.isSelected(id)) {
              this.zone.run(() => this.checklistSelection.select(id));
            }
          } else {
            this.zone.run(() => {
              this.checklistSelection.isSelected(id)
                ? this.checklistSelection.deselect(id)
                : this.checklistSelection.select(id);
            });
          }
          this.updateParentSelection(id);
        }
      }

      this.zone.run(() => {
        this.commonSearchStore.updateInsertMethod(
          CommonSearchInteractionType.FromSelection,
        );
      });
    });
  }

  // Selection handling methods
  public itemSelectionToggle(node: TreeFlatNode, selectOnly: boolean): void {
    const id = node.id;
    const itemIsSelected = this.checklistSelection.isSelected(id);

    if (selectOnly && !itemIsSelected) {
      this.checklistSelection.select(id);
    } else if (!selectOnly) {
      itemIsSelected
        ? this.checklistSelection.deselect(id)
        : this.checklistSelection.select(id);
    }

    // Update descendants
    const descendants = this.descendantsMap.get(id) || [];
    if (this.checklistSelection.isSelected(id)) {
      this.checklistSelection.select(...descendants);
    } else {
      this.checklistSelection.deselect(...descendants);
    }
    this.updateParentSelection(id);
    this.commonSearchStore.updateInsertMethod(
      CommonSearchInteractionType.FromSelection,
    );
  }

  public leafItemSelectionToggle(
    node: TreeFlatNode,
    selectOnly: boolean,
  ): void {
    const id = node.id;

    if (selectOnly) {
      if (!this.checklistSelection.isSelected(id)) {
        this.checklistSelection.select(id);
      }
    } else {
      this.checklistSelection.toggle(id);
    }

    this.updateParentSelection(id);
    this.commonSearchStore.updateInsertMethod(
      CommonSearchInteractionType.FromSelection,
    );
  }

  // Helper methods
  private buildRelationshipMaps(): void {
    const nodes = this.treeControl.dataNodes;

    // Build parent map
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.header) continue;

      // Find parent by walking backwards
      let parentId: string | null = null;
      for (let j = i - 1; j >= 0; j--) {
        if (nodes[j].level < node.level) {
          parentId = nodes[j].id;
          break;
        }
      }

      if (parentId) {
        this.parentMap.set(node.id, parentId);
      }
    }

    // Build descendants map
    for (const node of nodes) {
      if (!node.expandable || node.header) continue;

      const descendants = this.treeControl
        .getDescendants(node)
        .filter((d) => !d.header)
        .map((d) => d.id);

      this.descendantsMap.set(node.id, descendants);
    }
  }

  private updateParentSelection(nodeId: string): void {
    let parentId = this.parentMap.get(nodeId);
    while (parentId) {
      const descendants = this.descendantsMap.get(parentId) || [];
      const allSelected =
        descendants.length > 0 &&
        descendants.every((id) => this.checklistSelection.isSelected(id));
      const isSelected = this.checklistSelection.isSelected(parentId);

      if (allSelected && !isSelected) {
        this.checklistSelection.select(parentId);
      } else if (!allSelected && isSelected) {
        this.checklistSelection.deselect(parentId);
      }

      parentId = this.parentMap.get(parentId);
    }
  }

  private emitSelection(): void {
    if (this.isProcessing) return;

    const selectedIds = this.checklistSelection.selected;
    const selectedFlatNodes = selectedIds
      .map((id) => this.nodeMap.get(id))
      .filter(
        (node) => node && !node.header && !node.disabled,
      ) as TreeFlatNode[];

    if (!selectedFlatNodes.length) {
      this.selected.emit({ data: [], values: [], displayText: [] });
      return;
    }

    // Collect all ancestors of selected nodes (even if not selected themselves)
    const allIdsNeeded = new Set<string>();
    for (const node of selectedFlatNodes) {
      let cur: string | undefined = node.id;
      while (cur) {
        if (!allIdsNeeded.has(cur)) allIdsNeeded.add(cur);
        cur = this.parentMap.get(cur);
      }
    }

    // Build parent -> immediate children map restricted to needed ids
    const childMap = new Map<string, string[]>();
    for (const id of allIdsNeeded) {
      const parentId = this.parentMap.get(id);
      if (parentId && allIdsNeeded.has(parentId)) {
        if (!childMap.has(parentId)) childMap.set(parentId, []);
        childMap.get(parentId)!.push(id);
      }
    }

    // Determine roots (ids with no parent inside the needed set)
    const roots: string[] = [];
    for (const id of allIdsNeeded) {
      const parentId = this.parentMap.get(id);
      if (!parentId || !allIdsNeeded.has(parentId)) {
        roots.push(id);
      }
    }

    // Recursive rebuild of hierarchical TreeNode objects
    const buildTreeNode = (id: string): TreeNode => {
      const flat = this.nodeMap.get(id);
      const childIds = childMap.get(id) || [];
      return {
        header: flat?.header ?? false,
        items: flat?.items ?? [],
        children: childIds.map(buildTreeNode),
      };
    };

    const data = roots.map(buildTreeNode);

    const values = selectedFlatNodes
      .flatMap((node) => node.items)
      .filter((item) => item.name === this.emitField)
      .map((item) => `${item.value}`);

    const displayText = selectedFlatNodes
      .flatMap((node) => node.items)
      .filter((item) => item.name === this.displayField)
      .map((item) => `${item.value}`);

    this.selected.emit({ data, values, displayText });
    this.cd.markForCheck();
  }

  private batchAutoSelect(values: string[]): void {
    if (!values.length) return;

    const idsToSelect: string[] = [];

    // Collect IDs for all matching values
    for (const value of values) {
      const normValue = this.normalizeValue(value);
      const ids = this.valueToIdMap.get(normValue) || [];
      idsToSelect.push(...ids);
    }

    if (idsToSelect.length) {
      this.zone.run(() => {
        this.checklistSelection.select(...idsToSelect);

        // Update parent selection for all selected nodes
        for (const id of idsToSelect) {
          this.updateParentSelection(id);
        }
      });
    }
  }

  public descendantsAllSelected(node: TreeFlatNode): boolean {
    const descendants = this.descendantsMap.get(node.id) || [];
    return (
      descendants.length > 0 &&
      descendants.every((id) => this.checklistSelection.isSelected(id))
    );
  }

  public descendantsPartiallySelected(node: TreeFlatNode): boolean {
    const descendants = this.descendantsMap.get(node.id) || [];
    const anySelected = descendants.some((id) =>
      this.checklistSelection.isSelected(id),
    );
    return anySelected && !this.descendantsAllSelected(node);
  }

  public hasChild = (n: number, nodeData: TreeFlatNode): boolean =>
    nodeData.expandable;

  public filterInvisibleItems(items: Array<Item>): Array<Item> {
    return items.filter((item) => item.visible !== false);
  }

  private normalizeValue(val: unknown): string {
    return `${val}`.replace(/\s/g, '').toUpperCase();
  }
}
