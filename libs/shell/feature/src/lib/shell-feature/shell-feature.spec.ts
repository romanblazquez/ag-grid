import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ShellFeature } from './shell-feature';

describe('ShellFeature', () => {
  let component: ShellFeature;
  let fixture: ComponentFixture<ShellFeature>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShellFeature],
    }).compileComponents();

    fixture = TestBed.createComponent(ShellFeature);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
