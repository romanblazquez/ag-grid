import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Context } from '../../model/search-context.model';
import { SearchType } from '../../model/search-type.enum';
import { HdsGridViewResultComponent } from './hds-grid-view-result.component';

describe('HdsGridViewResultComponent', () => {
  let fixture: ComponentFixture<HdsGridViewResultComponent>;
  let component: HdsGridViewResultComponent;

  const context: Context = {
    searchType: SearchType.Broker,
    placeholder: 'Broker',
    emitField: 'firmSourceId',
    detailFields: [
      { name: 'firmName', visible: true },
      { name: 'firmCode', visible: true },
    ],
    detailHeaders: ['Firm Name', 'Code'],
    fieldWidths: { firmName: 70, firmCode: 30 },
    multiselect: true,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HdsGridViewResultComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HdsGridViewResultComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('viewContext', context);
  });

  it('emits numeric values for numeric emit fields', () => {
    const selected = jest.fn();
    component.selected.subscribe(selected);
    fixture.componentRef.setInput('searchResults', [
      { firmSourceId: 1001, firmName: 'Goldman Sachs & Co. LLC', firmCode: 'GS' },
    ]);
    fixture.detectChanges();

    component.toggle(component.rows()[0]);

    expect(selected).toHaveBeenCalledWith({
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
  });

  it('honors disable rules before toggling a row', () => {
    const selected = jest.fn();
    component.selected.subscribe(selected);
    fixture.componentRef.setInput('disableRule', () => true);
    fixture.componentRef.setInput('searchResults', [
      { firmSourceId: 1001, firmName: 'Goldman Sachs & Co. LLC', firmCode: 'GS' },
    ]);
    fixture.detectChanges();

    component.toggle(component.rows()[0]);

    expect(component.rows()[0].selected).toBe(false);
    expect(selected).not.toHaveBeenCalled();
  });
});
