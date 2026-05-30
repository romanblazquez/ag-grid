import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  GridViewResultComponent,
  MultiselectData,
} from './grid-view-result.component';
import { CommonSearchStore } from '../../data-access/store/common-search.store';
import { of } from 'rxjs';
import { Context } from '../../model/context.model';
import { AbstractData } from '../../model/solr-response.model';

describe('GridViewResultComponent', () => {
  let component: GridViewResultComponent<any>;
  let fixture: ComponentFixture<GridViewResultComponent<any>>;

  const mockViewContext: Context = {
    multiselect: true,
    emitField: 'id',
    detailFields: [
      { name: 'name', visible: true },
      { name: 'description', visible: true },
    ],
    detailHeaders: ['Name', 'Description'],
    fieldWidths: { name: 50, description: 50 },
    initLoadData: false,
    panelWidth: 300,
    placeholder: 'Search',
    errorMessage: 'Error',
  };

  const mockSearchResults = [
    { id: '1', name: 'Result 1', description: 'Description 1' },
    { id: '2', name: 'Result 2', description: 'Description 2' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GridViewResultComponent],
      providers: [
        {
          provide: CommonSearchStore,
          useValue: {
            autoSelectActive$: of(false),
            autoSelectValue$: of(null),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GridViewResultComponent);
    component = fixture.componentInstance;
    component.viewContext = mockViewContext;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('@Input searchResults', () => {
    it('should generate multiselect data when searchResults are provided', () => {
      component.searchResults = mockSearchResults;
      fixture.detectChanges();

      expect(component.multiselectRows?.length).toBe(2);
      expect(component.multiselectRows?.[0].data).toEqual(mockSearchResults[0]);
      expect(component.multiselectRows?.[1].data).toEqual(mockSearchResults[1]);
    });

    it('should preserve selection when searchResults are updated', () => {
      component.searchResults = mockSearchResults;
      component.multiselectRows![0].selected = true;
      component.prevSelected = [mockSearchResults[0]];

      const newSearchResults = [
        ...mockSearchResults,
        { id: '3', name: 'Result 3', description: 'Description 3' },
      ];
      component.searchResults = newSearchResults;
      fixture.detectChanges();

      expect(component.multiselectRows?.length).toBe(3);
      expect(component.multiselectRows?.[0].selected).toBe(true);
    });
  });

  describe('@Input clearSelection', () => {
    it('should clear selection when clearSelection is true', () => {
      component.searchResults = mockSearchResults;
      component.multiselectRows![0].selected = true;
      component.prevSelected = [mockSearchResults[0]];

      const emitSpy = jest.spyOn(component.selected, 'emit');
      component.clearSelection = true;
      fixture.detectChanges();

      expect(component.multiselectRows?.every((row) => !row.selected)).toBe(
        true,
      );
      expect(component.prevSelected.length).toBe(0);
      expect(emitSpy).toHaveBeenCalledWith({
        data: [],
        values: [],
        displayText: [],
      });
    });
  });

  describe('@Input autoToggle', () => {
    it('should deselect an item when autoToggle is triggered', () => {
      component.searchResults = mockSearchResults;
      component.multiselectRows![0].selected = true;

      const findRowAndToggleSpy = jest.spyOn(
        component as any,
        'findRowAndToggle',
      );
      component.autoToggle = { deselect: 'Result 1' };
      fixture.detectChanges();

      expect(findRowAndToggleSpy).toHaveBeenCalledWith('Result 1', false);
    });
  });

  describe('onSingleRowSelected', () => {
    it('should emit selected data for a single row selection', () => {
      const emitSpy = jest.spyOn(component.selected, 'emit');
      const row: MultiselectData = {
        selected: false,
        data: mockSearchResults[0] as AbstractData,
      };
      component.onSingleRowSelected(row);

      expect(emitSpy).toHaveBeenCalledWith({
        data: [mockSearchResults[0]],
        values: ['1'],
        displayText: ['Result 1'],
      });
      expect(component.prevSelected).toEqual([mockSearchResults[0]]);
    });
  });

  describe('onMultiselectRowClick', () => {
    it('should toggle row selection and emit values', () => {
      component.searchResults = mockSearchResults;
      const row = component.multiselectRows![0];
      const emitSpy = jest.spyOn(component, 'emitSelectedValues');

      component.onMultiselectRowClick(row, false);
      expect(row.selected).toBe(true);
      expect(emitSpy).toHaveBeenCalled();

      component.onMultiselectRowClick(row, false);
      expect(row.selected).toBe(false);
      expect(emitSpy).toHaveBeenCalled();
    });

    it('should only select a row when selectOnly is true', () => {
      component.searchResults = mockSearchResults;
      const row = component.multiselectRows![0];
      row.selected = false;
      const emitSpy = jest.spyOn(component, 'emitSelectedValues');

      component.onMultiselectRowClick(row, true);
      expect(row.selected).toBe(true);
      expect(emitSpy).toHaveBeenCalled();

      component.onMultiselectRowClick(row, true);
      expect(row.selected).toBe(true);
      expect(emitSpy).toHaveBeenCalledTimes(2);
    });

    it('should not select a disabled row', () => {
      component.disableRule = () => true;
      component.searchResults = mockSearchResults;
      const row = component.multiselectRows![0];
      const emitSpy = jest.spyOn(component, 'emitSelectedValues');

      component.onMultiselectRowClick(row, false);
      expect(row.selected).toBe(false);
      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  describe('emitSelectedValues', () => {
    it('should emit currently selected values', () => {
      component.searchResults = mockSearchResults;
      component.multiselectRows![0].selected = true;
      const emitSpy = jest.spyOn(component.selected, 'emit');

      component.emitSelectedValues();

      expect(emitSpy).toHaveBeenCalledWith({
        data: [mockSearchResults[0]],
        values: ['1'],
        displayText: ['Result 1'],
      });
      expect(component.prevSelected).toEqual([mockSearchResults[0]]);
    });
  });

  describe('findRowAndToggle', () => {
    it('should find a row by value and toggle its selection', () => {
      component.searchResults = mockSearchResults;
      const onMultiselectRowClickSpy = jest.spyOn(
        component,
        'onMultiselectRowClick',
      );

      (component as any).findRowAndToggle('Result 1', true);

      expect(onMultiselectRowClickSpy).toHaveBeenCalledWith(
        component.multiselectRows![0],
        true,
      );
    });
  });

  describe('getSearchResultByColumn', () => {
    it('should return the value of a specific column from a search result', () => {
      const result = component.getSearchResultByColumn(
        mockSearchResults[0],
        'name',
      );
      expect(result).toBe('Result 1');
    });
  });
});

describe('GridViewResultComponent: ngOnInit auto-selection', () => {
  let component: GridViewResultComponent<any>;
  let fixture: ComponentFixture<GridViewResultComponent<any>>;

  const mockViewContext: Context = {
    multiselect: true,
    emitField: 'id',
    detailFields: [
      { name: 'name', visible: true },
      { name: 'description', visible: true },
    ],
    detailHeaders: ['Name', 'Description'],
    fieldWidths: { name: 50, description: 50 },
    initLoadData: false,
    panelWidth: 300,
    placeholder: 'Search',
    errorMessage: 'Error',
  };

  const mockSearchResults = [
    { id: '1', name: 'Result 1', description: 'Description 1' },
    { id: '2', name: 'Result 2', description: 'Description 2' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GridViewResultComponent],
      providers: [
        {
          provide: CommonSearchStore,
          useValue: {
            autoSelectActive$: of(true),
            autoSelectValue$: of('Result 1,Result 2'),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GridViewResultComponent);
    component = fixture.componentInstance;
    component.viewContext = mockViewContext;
  });

  it('should auto-select items when autoSearchActive$ is true', () => {
    const findRowAndToggleSpy = jest.spyOn(
      component as any,
      'findRowAndToggle',
    );

    component.searchResults = mockSearchResults;
    component.ngOnInit();
    fixture.detectChanges();

    expect(findRowAndToggleSpy).toHaveBeenCalledWith('Result 1', true);
    expect(findRowAndToggleSpy).toHaveBeenCalledWith('Result 2', true);
  });
});
