import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ViewDropdownComponent } from './view-dropdown.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ConfirmationService } from 'primeng/api';
import { GridViewModel } from '../../models/grid-view.model';

describe('ViewDropdownComponent', () => {
  let component: ViewDropdownComponent;
  let fixture: ComponentFixture<ViewDropdownComponent>;
  let confirmationService: ConfirmationService;

  const mockGridState = {
    filter: { filterModel: {} },
    sort: { sortModel: [] },
    columnOrder: { orderedColIds: [] },
  };

  const mockViews: GridViewModel[] = [
    {
      id: 'view-1',
      name: 'Default View',
      gridState: mockGridState,
      isDefault: true,
      isSelected: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'view-2',
      name: 'Custom View',
      gridState: mockGridState,
      isDefault: false,
      isSelected: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'view-3',
      name: 'Another View',
      gridState: mockGridState,
      isDefault: false,
      isSelected: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, ViewDropdownComponent],
      providers: [ConfirmationService],
    }).compileComponents();

    fixture = TestBed.createComponent(ViewDropdownComponent);
    component = fixture.componentInstance;
    confirmationService =
      fixture.debugElement.injector.get(ConfirmationService);
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (fixture) {
      fixture.destroy();
    }
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Initialization', () => {
    it('should initialize with default values', () => {
      expect(component.currentViewName).toBe('Default View');
      expect(component.panelOpen).toBe(false);
      expect(component.activeMenuView).toBeNull();
      expect(component.menuPosition).toBe('right');
    });

    it('should have overlay positions defined', () => {
      expect(component.overlayPositions).toBeDefined();
      expect(component.overlayPositions.length).toBeGreaterThan(0);
    });

    it('should initialize with empty views', () => {
      expect(component.views).toEqual([]);
    });
  });

  describe('Views Input', () => {
    it('should set views correctly', () => {
      component.views = mockViews;
      expect(component.views).toEqual(mockViews);
    });

    it('should handle undefined views', () => {
      component.views = undefined;
      expect(component.views).toEqual([]);
    });

    it('should handle empty array', () => {
      component.views = [];
      expect(component.views).toEqual([]);
    });
  });

  describe('Filtered Views', () => {
    it('should return all views when only one view exists', () => {
      component.views = [mockViews[0]];
      expect(component.filteredViews).toEqual([mockViews[0]]);
    });

    it('should filter out default views when multiple views exist', () => {
      component.views = mockViews;
      const filtered = component.filteredViews;
      expect(filtered).toHaveLength(2);
      expect(filtered.every((v) => !v.isDefault)).toBe(true);
    });

    it('should return empty array when no views', () => {
      component.views = [];
      expect(component.filteredViews).toEqual([]);
    });
  });

  describe('Menu Management', () => {
    it('should open menu for a view', () => {
      const view = { name: 'Test View' };
      const mockEvent = {
        target: document.createElement('button'),
      } as unknown as MouseEvent;
      jest.spyOn(component as any, 'calculateMenuPosition');

      component.openMenu(view, mockEvent);

      expect(component.activeMenuView).toBe('Test View');
      expect((component as any).calculateMenuPosition).toHaveBeenCalledWith(
        mockEvent,
      );
    });

    it('should close menu', () => {
      component.activeMenuView = 'Test View';
      component.closeMenu();
      expect(component.activeMenuView).toBeNull();
    });

    it('should calculate menu position to right when space available', () => {
      const mockElement = {
        getBoundingClientRect: jest.fn().mockReturnValue({ right: 100 }),
      };
      const mockEvent = { target: mockElement } as unknown as MouseEvent;
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920,
      });
      (component as any).calculateMenuPosition(mockEvent);
      expect(component.menuPosition).toBe('right');
    });

    it('should calculate menu position to left when space limited', () => {
      const mockElement = {
        getBoundingClientRect: jest.fn().mockReturnValue({ right: 1900 }),
      };
      const mockEvent = { target: mockElement } as unknown as MouseEvent;
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920,
      });
      (component as any).calculateMenuPosition(mockEvent);
      expect(component.menuPosition).toBe('left');
    });
  });

  describe('Panel Management', () => {
    it('should toggle panel open', () => {
      component.panelOpen = false;
      component.togglePanel();
      expect(component.panelOpen).toBe(true);
    });

    it('should toggle panel closed', () => {
      component.panelOpen = true;
      component.togglePanel();
      expect(component.panelOpen).toBe(false);
    });

    it('should close panel and menu', () => {
      component.panelOpen = true;
      component.activeMenuView = 'Test View';
      component.closePanel();
      expect(component.panelOpen).toBe(false);
      expect(component.activeMenuView).toBeNull();
    });
  });

  describe('View Selection', () => {
    it('should emit selectView event', () => {
      const emitSpy = jest.spyOn(component.selectView, 'emit');
      component.select('Custom View');
      expect(component.currentViewName).toBe('Custom View');
      expect(emitSpy).toHaveBeenCalledWith('Custom View');
    });

    it('should select and close panel', () => {
      component.panelOpen = true;
      const selectSpy = jest.spyOn(component, 'select');
      const closePanelSpy = jest.spyOn(component, 'closePanel');
      component.selectAndClose('Test View');
      expect(selectSpy).toHaveBeenCalledWith('Test View');
      expect(closePanelSpy).toHaveBeenCalled();
    });
  });

  describe('Create New View', () => {
    it('should open dialog state and close panel', () => {
      const closePanelSpy = jest.spyOn(component, 'closePanel');
      component.createNewView();
      expect(closePanelSpy).toHaveBeenCalled();
      expect(component.dialogVisible).toBe(true);
      expect(component.dialogEditMode).toBe(false);
      expect(component.dialogInitialData).toEqual({});
    });

    it('should emit createView on dialog save with create mode', () => {
      component.createNewView();
      const emitSpy = jest.spyOn(component.createView, 'emit');
      component.onDialogSave({ mode: 'create', name: 'New View' });
      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New View',
          isDefault: false,
          isSelected: true,
        }),
      );
    });

    it('should not emit createView when dialog cancelled', () => {
      component.createNewView();
      const emitSpy = jest.spyOn(component.createView, 'emit');
      component.onDialogCancel();
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should create and close panel', () => {
      const createSpy = jest.spyOn(component, 'createNewView');
      const closePanelSpy = jest.spyOn(component, 'closePanel');
      component.createAndClose();
      expect(createSpy).toHaveBeenCalled();
      expect(closePanelSpy).toHaveBeenCalled();
    });
  });

  describe('Edit Existing View', () => {
    it('should open dialog in edit mode for the view', () => {
      component.views = mockViews;
      const closePanelSpy = jest.spyOn(component, 'closePanel');
      const closeMenuSpy = jest.spyOn(component, 'closeMenu');

      component.editExistingView('view-2');

      expect(closePanelSpy).toHaveBeenCalled();
      expect(closeMenuSpy).toHaveBeenCalled();
      expect(component.dialogVisible).toBe(true);
      expect(component.dialogEditMode).toBe(true);
      expect(component.dialogInitialData).toEqual(
        expect.objectContaining({ name: 'Custom View' }),
      );
    });

    it('should emit editView on dialog save', () => {
      component.views = mockViews;
      component.editExistingView('view-2');
      const emitSpy = jest.spyOn(component.editView, 'emit');

      component.onDialogSave({ mode: 'edit', name: 'Updated View' });

      expect(emitSpy).toHaveBeenCalledWith({
        oldName: 'Custom View',
        newName: 'Updated View',
      });
    });

    it('should not emit editView when dialog cancelled', () => {
      component.views = mockViews;
      component.editExistingView('view-2');
      const emitSpy = jest.spyOn(component.editView, 'emit');

      component.onDialogCancel();

      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should not open dialog when view not found', () => {
      component.views = mockViews;
      component.editExistingView('non-existent-id');
      expect(component.dialogVisible).toBe(false);
    });
  });

  describe('Copy Existing View', () => {
    it('should open dialog with copied view data', () => {
      component.views = mockViews;
      const closeMenuSpy = jest.spyOn(component, 'closeMenu');

      component.copyExistingView('view-2');

      expect(closeMenuSpy).toHaveBeenCalled();
      expect(component.dialogVisible).toBe(true);
      expect(component.dialogEditMode).toBe(false);
      expect(component.dialogInitialData).toEqual(
        expect.objectContaining({ name: 'Custom View - copy' }),
      );
    });

    it('should emit createView with copied grid state on save', () => {
      component.views = mockViews;
      component.copyExistingView('view-2');
      const emitSpy = jest.spyOn(component.createView, 'emit');

      component.onDialogSave({ mode: 'create', name: 'Copied View' });

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Copied View',
          isDefault: false,
          isSelected: true,
          isSystemDefault: false,
          gridState: mockGridState,
        }),
      );
    });

    it('should not open dialog when view not found', () => {
      component.views = mockViews;
      component.copyExistingView('non-existent-id');
      expect(component.dialogVisible).toBe(false);
    });

    it('should not emit createView when dialog cancelled', () => {
      component.views = mockViews;
      component.copyExistingView('view-2');
      const emitSpy = jest.spyOn(component.createView, 'emit');

      component.onDialogCancel();

      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  describe('Delete Existing View', () => {
    it('should call confirmationService.confirm for delete', () => {
      component.views = mockViews;
      const confirmSpy = jest.spyOn(confirmationService, 'confirm');

      component.deleteExistingView(mockViews[1]);

      expect(confirmSpy).toHaveBeenCalledWith(
        expect.objectContaining({ header: 'Delete View' }),
      );
    });

    it('should emit deleteView when accept callback is called', () => {
      component.views = mockViews;
      const emitSpy = jest.spyOn(component.deleteView, 'emit');
      let capturedAccept: (() => void) | undefined;

      jest
        .spyOn(confirmationService, 'confirm')
        .mockImplementation((opts: any) => {
          capturedAccept = opts.accept;
          return confirmationService;
        });

      component.deleteExistingView(mockViews[1]);
      capturedAccept?.();

      expect(emitSpy).toHaveBeenCalledWith(mockViews[1]);
    });

    it('should not emit deleteView when reject callback is called', () => {
      component.views = mockViews;
      const emitSpy = jest.spyOn(component.deleteView, 'emit');
      let capturedReject: (() => void) | undefined;

      jest
        .spyOn(confirmationService, 'confirm')
        .mockImplementation((opts: any) => {
          capturedReject = opts.reject;
          return confirmationService;
        });

      component.deleteExistingView(mockViews[1]);
      capturedReject?.();

      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  describe('Generate Unique Name', () => {
    it('should return base name if not taken', () => {
      component.views = mockViews;
      const result = (component as any).generateUniqueName('Unique Name');
      expect(result).toBe('Unique Name');
    });

    it('should append (2) for first duplicate', () => {
      component.views = mockViews;
      const result = (component as any).generateUniqueName('Custom View');
      expect(result).toBe('Custom View (2)');
    });

    it('should increment counter for multiple duplicates', () => {
      component.views = [
        ...mockViews,
        { ...mockViews[1], id: 'view-4', name: 'Custom View (2)' },
        { ...mockViews[1], id: 'view-5', name: 'Custom View (3)' },
      ];
      const result = (component as any).generateUniqueName('Custom View');
      expect(result).toBe('Custom View (4)');
    });
  });

  describe('Event Emitters', () => {
    it('should have selectView event emitter', () => {
      expect(component.selectView).toBeDefined();
    });

    it('should have createView event emitter', () => {
      expect(component.createView).toBeDefined();
    });

    it('should have editView event emitter', () => {
      expect(component.editView).toBeDefined();
    });

    it('should have deleteView event emitter', () => {
      expect(component.deleteView).toBeDefined();
    });
  });
});
