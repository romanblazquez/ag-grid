import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { SearchType } from '../model/search-type.enum';
import { HdsCommonSearchComponent } from './hds-common-search.component';

describe('HdsCommonSearchComponent', () => {
  let fixture: ComponentFixture<HdsCommonSearchComponent>;
  let component: HdsCommonSearchComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HdsCommonSearchComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HdsCommonSearchComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('searchContext', {
      searchType: SearchType.Broker,
    });
    fixture.componentRef.setInput('dropdown', true);
    fixture.componentRef.setInput('minLengthForInputValue', 1);
    fixture.detectChanges();
  });

  it('opens initial results for an empty dropdown query', () => {
    component.onSearch({
      originalEvent: new MouseEvent('click'),
      query: '',
    } as AutoCompleteCompleteEvent);

    expect(component.panelVisible()).toBe(true);
    expect(component.searchResults().length).toBeGreaterThan(0);
  });

  it('keeps a chevron close click as a close-only action', () => {
    component.panelVisible.set(true);
    component.searchResults.set([{ firmSourceId: 1001 }]);

    component.toggleDropdown(new MouseEvent('click'));

    expect(component.panelVisible()).toBe(false);
    expect(component.searchResults()).toEqual([]);
  });

  it('reopens from the chevron after a close', () => {
    component.panelVisible.set(false);
    component.searchResults.set([]);

    component.toggleDropdown(new MouseEvent('click'));

    expect(component.panelVisible()).toBe(true);
    expect(component.searchResults().length).toBeGreaterThan(0);
  });

  it('toggles from the chevron across open, close, and reopen clicks', () => {
    component.searchResults.set([]);
    component.panelVisible.set(false);

    component.toggleDropdown(new MouseEvent('click'));
    expect(component.panelVisible()).toBe(true);

    component.toggleDropdown(new MouseEvent('click'));
    expect(component.panelVisible()).toBe(false);

    component.toggleDropdown(new MouseEvent('click'));
    expect(component.panelVisible()).toBe(true);
    expect(component.searchResults().length).toBeGreaterThan(0);
  });

  it('submits an enter query without clearing the input text', fakeAsync(() => {
    const input = fixture.nativeElement.querySelector(
      'input.p-autocomplete-input',
    ) as HTMLInputElement;
    input.value = 'Goldman';

    component.onInputKeyDown(new KeyboardEvent('keydown', { key: 'Enter' }));
    tick(500);

    expect(input.value).toBe('Goldman');
    expect(component.panelVisible()).toBe(true);
    expect(component.labelRaised()).toBe(true);
  }));

  it('resets an exhausted query back to initial results after all visible rows are selected', () => {
    const input = fixture.nativeElement.querySelector(
      'input.p-autocomplete-input',
    ) as HTMLInputElement;
    input.value = 'Goldman';
    component.lastTypedQuery.set('Goldman');
    component.searchResults.set([
      {
        firmSourceId: 1001,
        firmName: 'Goldman Sachs & Co. LLC',
        firmCode: 'GS',
      },
    ]);

    component.onSelected({
      data: [
        {
          firmSourceId: 1001,
          firmName: 'Goldman Sachs & Co. LLC',
          firmCode: 'GS',
        },
      ],
      values: [1001],
      displayText: ['Goldman Sachs & Co. LLC'],
    });

    expect(input.value).toBe('');
    expect(component.lastTypedQuery()).toBe('');
    expect(component.panelVisible()).toBe(true);
    expect(component.searchResults().length).toBeGreaterThan(1);
    expect(component.chipsValue()).toEqual(['Goldman Sachs & Co. LLC']);
  });
});
