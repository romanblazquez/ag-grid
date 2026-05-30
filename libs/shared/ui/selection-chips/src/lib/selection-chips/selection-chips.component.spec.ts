import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SelectionChipsComponent } from './selection-chips.component';

describe('SelectionChipsComponent', () => {
  let component: SelectionChipsComponent;
  let fixture: ComponentFixture<SelectionChipsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SelectionChipsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SelectionChipsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
