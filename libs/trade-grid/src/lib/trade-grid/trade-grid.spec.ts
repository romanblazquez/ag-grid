import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TradeGrid } from './trade-grid';

describe('TradeGrid', () => {
  let component: TradeGrid;
  let fixture: ComponentFixture<TradeGrid>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TradeGrid],
    }).compileComponents();

    fixture = TestBed.createComponent(TradeGrid);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
