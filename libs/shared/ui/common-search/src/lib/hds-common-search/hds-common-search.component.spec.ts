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

  it('does not reopen for the dropdown close event', () => {
    component.panelVisible.set(false);
    component.searchResults.set([]);

    component.onDropdownButtonClick({ query: undefined });

    expect(component.panelVisible()).toBe(false);
    expect(component.searchResults()).toEqual([]);
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
});
