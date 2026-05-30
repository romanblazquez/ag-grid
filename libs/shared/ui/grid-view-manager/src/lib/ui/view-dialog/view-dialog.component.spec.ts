import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { ViewDialogComponent } from './view-dialog.component';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

type ViewInitialData = {
  id?: string;
  name?: string;
  description?: string;
  isDefault?: boolean;
  isSelected?: boolean;
  gridState?: any;
  createdAt?: Date;
  updatedAt?: Date;
};

const baseNow = new Date('2026-02-22T00:00:00Z');

const defaultInitialData: ViewInitialData = {
  id: 'view-1',
  name: 'Default',
  description: '',
  isDefault: false,
  isSelected: false,
  gridState: {
    sort: { sortModel: [] },
    filter: { filterModel: {} },
    columnOrder: { orderedColIds: [] },
  },
  createdAt: baseNow,
  updatedAt: baseNow,
};

function setupDialog(
  overrides: {
    isEditMode?: boolean;
    isProcessing?: boolean;
    errorMessages?: string[];
    initialData?: ViewInitialData;
    visible?: boolean;
  } = {},
) {
  TestBed.resetTestingModule();

  TestBed.configureTestingModule({
    imports: [
      NoopAnimationsModule,
      FormsModule,
      ReactiveFormsModule,
      ViewDialogComponent,
    ],
  });

  const fixture: ComponentFixture<ViewDialogComponent> =
    TestBed.createComponent(ViewDialogComponent);
  const component = fixture.componentInstance;

  component.isEditMode = overrides.isEditMode ?? false;
  component.isProcessing = overrides.isProcessing ?? false;
  component.errorMessages = overrides.errorMessages ?? [];
  component.initialData = overrides.initialData ?? defaultInitialData;
  component.visible = overrides.visible ?? true;

  fixture.detectChanges();

  return { fixture, component };
}

describe('ViewDialogComponent', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Initialization', () => {
    it('should initialize with edit mode when provided', () => {
      const { component } = setupDialog({ isEditMode: true });
      expect(component.isEditMode).toBe(true);
    });

    it('should initialize with error messages when provided', () => {
      const { component } = setupDialog({
        errorMessages: ['Error 1', 'Error 2'],
      });
      expect(component.errorMessages).toEqual(['Error 1', 'Error 2']);
    });

    it('should initialize with processing state when provided', () => {
      const { component } = setupDialog({ isProcessing: true });
      expect(component.isProcessing).toBe(true);
    });

    it('should handle missing data properties gracefully', () => {
      const { component } = setupDialog({ initialData: {} as ViewInitialData });
      expect(component.viewForm).toBeTruthy();
      expect(component.viewForm.get('name')?.value ?? '').toBe('');
      expect(component.viewForm.valid).toBe(false);
    });

    it('should initialize form with empty name when no initial data', () => {
      const { component } = setupDialog({ initialData: {} as ViewInitialData });
      expect(component.viewForm.get('name')?.value).toBe('');
    });
  });

  describe('dialogHeader', () => {
    it('should return "Name View" in edit mode', () => {
      const { component } = setupDialog({ isEditMode: true });
      expect(component.dialogHeader).toBe('Name View');
    });

    it('should return "Create View" in create mode', () => {
      const { component } = setupDialog({ isEditMode: false });
      expect(component.dialogHeader).toBe('Create View');
    });
  });

  describe('onSave', () => {
    it('should emit save event with form value on valid submit', () => {
      const { component } = setupDialog();
      const saveSpy = jest.spyOn(component.save, 'emit');
      const visibleChangeSpy = jest.spyOn(component.visibleChange, 'emit');

      component.viewForm.patchValue({ name: 'New View Name' });
      component.onSave();

      expect(saveSpy).toHaveBeenCalledWith({
        mode: 'create',
        name: 'New View Name',
      });
      expect(visibleChangeSpy).toHaveBeenCalledWith(false);
    });

    it('should emit save with mode "edit" in edit mode', () => {
      const { component } = setupDialog({ isEditMode: true });
      const saveSpy = jest.spyOn(component.save, 'emit');

      component.viewForm.patchValue({ name: 'Updated Name' });
      component.onSave();

      expect(saveSpy).toHaveBeenCalledWith({
        mode: 'edit',
        name: 'Updated Name',
      });
    });

    it('should not emit save when form is invalid', () => {
      const { component } = setupDialog({ initialData: {} as ViewInitialData });
      const saveSpy = jest.spyOn(component.save, 'emit');

      component.onSave();

      expect(saveSpy).not.toHaveBeenCalled();
    });
  });

  describe('onCancel', () => {
    it('should emit cancel and close visible', () => {
      const { component } = setupDialog();
      const cancelSpy = jest.spyOn(component.cancelDialog, 'emit');
      const visibleChangeSpy = jest.spyOn(component.visibleChange, 'emit');

      component.onCancel();

      expect(cancelSpy).toHaveBeenCalled();
      expect(visibleChangeSpy).toHaveBeenCalledWith(false);
      expect(component.visible).toBe(false);
    });
  });

  describe('ngOnChanges', () => {
    it('should reset form with initialData name when visible becomes true', () => {
      const { component } = setupDialog({
        visible: false,
        initialData: { name: 'Preset' },
      });
      component.viewForm.patchValue({ name: 'Dirty' });

      component.visible = true;
      component.ngOnChanges({
        visible: {
          currentValue: true,
          previousValue: false,
          firstChange: false,
          isFirstChange: () => false,
        },
      });

      expect(component.viewForm.get('name')?.value).toBe('Preset');
    });
  });
});
