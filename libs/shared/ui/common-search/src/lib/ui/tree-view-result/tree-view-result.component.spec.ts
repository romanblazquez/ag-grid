import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TreeViewResultComponent } from './tree-view-result.component';
import { CommonModule } from '@angular/common';
import { MatTreeModule } from '@angular/material/tree';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { TreeNode } from '../../model/tree-result.model';
import { CommonSearchStore } from '../../data-access/store/common-search.store';
import { BehaviorSubject } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';

class MockCommonSearchStore {
  autoSelectActive$ = new BehaviorSubject<boolean>(false);
  autoSelectValue$ = new BehaviorSubject<string | null>(null);
  updateInsertMethod(_t: any) {}
}

describe('TreeViewResultComponent', () => {
  let component: TreeViewResultComponent;
  let fixture: ComponentFixture<TreeViewResultComponent>;
  let store: MockCommonSearchStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        NoopAnimationsModule,
        MatCheckboxModule,
        MatTreeModule,
        MatButtonModule,
        MatIconModule,
      ],
      providers: [
        { provide: CommonSearchStore, useClass: MockCommonSearchStore },
      ],
      declarations: [TreeViewResultComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TreeViewResultComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(
      CommonSearchStore,
    ) as unknown as MockCommonSearchStore;
    fixture.detectChanges();
  });

  it('creates component', () => {
    expect(component).toBeTruthy();
  });

  it('transformer caches non-header nodes and excludes header nodes from nodeMap', async () => {
    const node: TreeNode = {
      header: false,
      items: [{ name: 'A', value: 'x' }],
      children: [
        {
          header: true,
          items: [{ name: 'H', value: 'hdr' }],
        },
        {
          header: false,
          items: [{ name: 'B', value: 'y' }],
        },
      ],
    };
    const parentFlat = component.transformer(node, 0);
    const headerChildFlat = component.transformer(node.children![0], 1);
    const leafChildFlat = component.transformer(node.children![1], 1);

    expect(parentFlat.id).not.toEqual(leafChildFlat.id);
    expect(component.nodeMap.get(parentFlat.id)).toBe(parentFlat);
    expect(component.nodeMap.get(leafChildFlat.id)).toBe(leafChildFlat);
    // Header child not cached
    expect(component.nodeMap.get(headerChildFlat.id)).toBeUndefined();
  });

  it('leaf selection does not affect sibling leaves incorrectly', async () => {
    const tree: TreeNode[] = [
      {
        header: false,
        items: [{ name: 'root', value: 'R' }],
        children: [
          { header: false, items: [{ name: 'leaf', value: 'A' }] },
          { header: false, items: [{ name: 'leaf', value: 'B' }] },
        ],
      },
    ];
    component.fieldWidths = { leaf: 50, root: 50 };
    component.headers = ['leaf', 'root'];
    fixture.detectChanges();
    component.searchResults = tree;
    await fixture.whenStable();
    fixture.detectChanges();
    // Ensure dataNodes are populated
    expect(component.treeControl.dataNodes.length).toBeGreaterThan(0);
    const a = component.treeControl.dataNodes.find(
      (n) => n.items[0].value === 'A',
    )!;
    const b = component.treeControl.dataNodes.find(
      (n) => n.items[0].value === 'B',
    )!;
    // Ensure nodes were found before proceeding
    if (!a || !b) {
      throw new Error('Test nodes A or B could not be found in the tree.');
    }
    expect(a).toBeDefined();
    expect(b).toBeDefined();
    component.leafItemSelectionToggle(a, false);
    fixture.detectChanges();
    expect(component.checklistSelection.isSelected(a.id)).toBe(true);
    expect(component.checklistSelection.isSelected(b.id)).toBe(false);
  });

  it('clearing selection emits empty arrays', async () => {
    const tree: TreeNode[] = [
      { header: false, items: [{ name: 'v', value: 'A' }] },
    ];

    component.fieldWidths = { leaf: 50, root: 50 };
    component.headers = ['leaf', 'root'];
    fixture.detectChanges();
    component.searchResults = tree;
    await fixture.whenStable();
    fixture.detectChanges();

    const node = component.treeControl.dataNodes[0];
    const spy = jest.spyOn(component.selected, 'emit');

    component.leafItemSelectionToggle(node, false);
    component.clearSelection = true;
    fixture.detectChanges();
    // Wait > debounceTime (50ms)
    await new Promise((r) => setTimeout(r, 60));
    fixture.detectChanges();
    const emitted = spy.mock.calls.at(-1)?.[0];
    expect(emitted).toEqual({ data: [], values: [], displayText: [] });
  });

  it('auto-select batch selects matching nodes', async () => {
    const tree: TreeNode[] = [
      { header: false, items: [{ name: 'code', value: 'ABC' }] },
      { header: false, items: [{ name: 'code', value: 'DEF' }] },
    ];

    component.fieldWidths = { leaf: 50, root: 50 };
    component.headers = ['leaf', 'root'];
    fixture.detectChanges();
    component.searchResults = tree;
    await fixture.whenStable();
    fixture.detectChanges();

    store.autoSelectValue$.next('abc,def');
    store.autoSelectActive$.next(true);
    const selectedValues = component.checklistSelection.selected.length;
    expect(selectedValues).toBe(2);
  });

  it('selectOrDeselect normalization matches values ignoring case and whitespace', async () => {
    const tree: TreeNode[] = [
      { header: false, items: [{ name: 'code', value: 'Va Lue' }] },
      { header: false, items: [{ name: 'code', value: 'VALUE' }] },
    ];
    component.fieldWidths = { leaf: 50, root: 50 };
    component.headers = ['leaf', 'root'];
    fixture.detectChanges();
    component.searchResults = tree;
    await fixture.whenStable();
    fixture.detectChanges();
    component.selectOrDeselect(' value ', true);
    expect(component.checklistSelection.selected.length).toBe(2);
  });

  it('large dataset (>=1500) does not auto expand all', async () => {
    const large: TreeNode[] = [];
    for (let i = 0; i < 1501; i++) {
      large.push({
        header: false,
        items: [{ name: 'v', value: `N${i}` }],
      });
    }
    const expandSpy = jest.spyOn(component.treeControl, 'expandAll');
    component.fieldWidths = { leaf: 50, root: 50 };
    component.headers = ['leaf', 'root'];
    fixture.detectChanges();
    component.searchResults = large;
    await fixture.whenStable();
    fixture.detectChanges();
    expect(expandSpy).not.toHaveBeenCalled();
  });

  it('filterInvisibleItems removes items with visible === false', async () => {
    const items = [
      { name: 'a', value: 1, visible: true },
      { name: 'b', value: 2, visible: false },
      { name: 'c', value: 3 },
    ];
    const filtered = component.filterInvisibleItems(items as any);
    expect(filtered.find((i) => i.name === 'b')).toBeUndefined();
    expect(filtered.length).toBe(2);
  });

  it('descendantsAllSelected false when no descendants', async () => {
    const tree: TreeNode[] = [
      { header: false, items: [{ name: 'solo', value: 'S' }] },
    ];
    component.fieldWidths = { leaf: 50, root: 50 };
    component.headers = ['leaf', 'root'];
    fixture.detectChanges();
    component.searchResults = tree;
    await fixture.whenStable();
    fixture.detectChanges();

    const flat = component.treeControl.dataNodes[0];
    expect(component.descendantsAllSelected(flat)).toBe(false);
  });

  it('descendantsPartiallySelected false when none selected', async () => {
    const tree: TreeNode[] = [
      {
        header: false,
        items: [{ name: 'root', value: 'R' }],
        children: [{ header: false, items: [{ name: 'leaf', value: 'L' }] }],
      },
    ];
    component.fieldWidths = { leaf: 50, root: 50 };
    component.headers = ['leaf', 'root'];
    fixture.detectChanges();
    component.searchResults = tree;
    await fixture.whenStable();
    fixture.detectChanges();

    const root = component.treeControl.dataNodes.find(
      (n) => n.items[0].value === 'R',
    )!;
    expect(component.descendantsPartiallySelected(root)).toBe(false);
  });
});
