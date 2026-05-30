/*
 * Copyright (c) 2025 FMR Corp.
 * All Rights Reserved.
 *
 * Fidelity Confidential Information.
 */

import { Component, DebugElement, NgZone } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import {
  SizeChangedEvent,
  VerticalResizeDirective,
} from './vertical-resize.directive';

// ── Host component ────────────────────────────────────────────────────────────

@Component({
  standalone: true,
  imports: [VerticalResizeDirective],
  template: `
    <div
      verticalResize
      style="height: 200px; width: 400px; position: relative;"
      (sizeChanged)="onSizeChanged($event)"
      (edgeDoubleClicked)="onEdgeDoubleClicked()"
    ></div>
  `,
})
class TestHostComponent {
  sizeChangedEvents: SizeChangedEvent[] = [];
  edgeDoubleClickedCount = 0;

  onSizeChanged(event: SizeChangedEvent): void {
    this.sizeChangedEvents.push(event);
  }

  onEdgeDoubleClicked(): void {
    this.edgeDoubleClickedCount++;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Creates a MouseEvent with clientY positioned relative to a bounding rect. */
function mouseEvent(type: string, clientY: number, clientX = 0): MouseEvent {
  return new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX,
    clientY,
  });
}

/**
 * Stubs getBoundingClientRect on the native element so that `bottom` is at
 * the given value, making it easy to simulate edge / non-edge positions.
 */
function stubRect(el: HTMLElement, bottom: number): void {
  jest.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    bottom,
    top: bottom - 200,
    left: 0,
    right: 400,
    width: 400,
    height: 200,
    x: 0,
    y: bottom - 200,
    toJSON: () => ({}),
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('VerticalResizeDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;
  let de: DebugElement;
  let el: HTMLElement;
  let directive: VerticalResizeDirective;
  let ngZone: NgZone;

  // The directive uses a static flag to avoid re-injecting styles; reset it between tests.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resetStyleFlag = () =>
    ((VerticalResizeDirective as any).styleInjected = false);

  beforeEach(() => {
    resetStyleFlag();

    TestBed.configureTestingModule({
      imports: [TestHostComponent],
    });

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    ngZone = TestBed.inject(NgZone);

    fixture.detectChanges();

    de = fixture.debugElement.query(By.directive(VerticalResizeDirective));
    el = de.nativeElement as HTMLElement;
    directive = de.injector.get(VerticalResizeDirective);

    // Default: element is 200px tall, bottom edge at y=200
    stubRect(el, 200);
    Object.defineProperty(el, 'offsetHeight', {
      configurable: true,
      get: () => 200,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── Creation ────────────────────────────────────────────────────────────────

  describe('initialisation', () => {
    it('should create the directive', () => {
      expect(directive).toBeTruthy();
    });

    it('should inject the global styles into <head> once', () => {
      const stylesBefore = document.head.querySelectorAll('style').length;
      // Resetting flag and re-triggering init to simulate a second instance
      resetStyleFlag();
      directive.ngOnInit();
      directive.ngOnInit(); // second call — should not add a second block
      const stylesAfter = document.head.querySelectorAll('style').length;
      expect(stylesAfter).toBe(stylesBefore + 1);
    });

    it('should set position:relative when the element is position:static', () => {
      el.style.position = 'static';
      directive.ngOnInit();
      expect(el.style.position).toBe('relative');
    });

    it('should not override position when element is already positioned', () => {
      el.style.position = 'absolute';
      directive.ngOnInit();
      expect(el.style.position).toBe('absolute');
    });
  });

  // ── Cursor / hover highlight ─────────────────────────────────────────────

  describe('cursor and hover class', () => {
    it('should set ns-resize cursor and add vr-edge-hover when over bottom edge', () => {
      // bottom=200, threshold=14 → any clientY >= 186 is on-edge
      el.dispatchEvent(mouseEvent('mousemove', 195));
      expect(el.style.cursor).toBe('ns-resize');
      expect(el.classList.contains('vr-edge-hover')).toBe(true);
    });

    it('should clear cursor and vr-edge-hover when NOT over bottom edge', () => {
      // First hover on edge, then move away
      el.dispatchEvent(mouseEvent('mousemove', 195));
      el.dispatchEvent(mouseEvent('mousemove', 100));
      expect(el.style.cursor).toBe('');
      expect(el.classList.contains('vr-edge-hover')).toBe(false);
    });

    it('should clear cursor and vr-edge-hover on mouseleave', () => {
      el.dispatchEvent(mouseEvent('mousemove', 195));
      el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
      expect(el.classList.contains('vr-edge-hover')).toBe(false);
    });
  });

  // ── Drag resize ──────────────────────────────────────────────────────────

  describe('drag resize', () => {
    it('should add vr-edge-dragging class on mousedown at bottom edge', () => {
      el.dispatchEvent(mouseEvent('mousedown', 195));
      expect(el.classList.contains('vr-edge-dragging')).toBe(true);
    });

    it('should NOT start drag when mousedown is far from bottom edge', () => {
      el.dispatchEvent(mouseEvent('mousedown', 100));
      expect(el.classList.contains('vr-edge-dragging')).toBe(false);
    });

    it('should update element height during mousemove', () => {
      // Start drag from y=195 (on edge, bottom=200), move down by 50px
      el.dispatchEvent(mouseEvent('mousedown', 195));
      window.dispatchEvent(mouseEvent('mousemove', 245));
      // 200 (startHeight) + 50 (delta) = 250W
      expect(el.style.height).toBe('250px');
    });

    it('should emit sizeChanged on every mousemove during drag', () => {
      el.dispatchEvent(mouseEvent('mousedown', 195));
      window.dispatchEvent(mouseEvent('mousemove', 210));
      window.dispatchEvent(mouseEvent('mousemove', 220));
      expect(host.sizeChangedEvents.length).toBe(2);
      expect(host.sizeChangedEvents[0].height).toBe(215); // 200 + (210-195)
      expect(host.sizeChangedEvents[1].height).toBe(225); // 200 + (220-195)
    });

    it('should emit sizeChanged with final height on mouseup after drag', () => {
      el.dispatchEvent(mouseEvent('mousedown', 195));
      window.dispatchEvent(mouseEvent('mousemove', 250));
      const countAfterMove = host.sizeChangedEvents.length;
      window.dispatchEvent(mouseEvent('mouseup', 250));
      // One more emit on drag end
      expect(host.sizeChangedEvents.length).toBe(countAfterMove + 1);
    });

    it('should enforce a minimum height of 50px', () => {
      el.dispatchEvent(mouseEvent('mousedown', 195));
      // Drag up way beyond the element top
      window.dispatchEvent(mouseEvent('mousemove', 0));
      expect(el.style.height).toBe('50px');
    });

    it('should remove vr-edge-dragging class on mouseup', () => {
      el.dispatchEvent(mouseEvent('mousedown', 195));
      window.dispatchEvent(mouseEvent('mousemove', 220));
      window.dispatchEvent(mouseEvent('mouseup', 220));
      expect(el.classList.contains('vr-edge-dragging')).toBe(false);
    });

    it('should NOT emit sizeChanged on mouseup when no movement happened (part of dblclick)', () => {
      el.dispatchEvent(mouseEvent('mousedown', 195));
      window.dispatchEvent(mouseEvent('mouseup', 195)); // no mousemove in between
      expect(host.sizeChangedEvents.length).toBe(0);
    });
  });

  // ── Double-click ─────────────────────────────────────────────────────────

  describe('double-click on bottom edge', () => {
    it('should emit edgeDoubleClicked when dblclick is on bottom edge', () => {
      el.dispatchEvent(mouseEvent('dblclick', 195));
      expect(host.edgeDoubleClickedCount).toBe(1);
    });

    it('should NOT emit edgeDoubleClicked when dblclick is far from bottom edge', () => {
      el.dispatchEvent(mouseEvent('dblclick', 100));
      expect(host.edgeDoubleClickedCount).toBe(0);
    });

    it('should NOT emit sizeChanged during the phantom mousedown/mouseup of a dblclick', () => {
      // Simulate browser dblclick sequence: mousedown → mouseup → mousedown → mouseup → dblclick
      el.dispatchEvent(mouseEvent('mousedown', 195));
      window.dispatchEvent(mouseEvent('mouseup', 195));
      el.dispatchEvent(mouseEvent('mousedown', 195));
      window.dispatchEvent(mouseEvent('mouseup', 195));
      el.dispatchEvent(mouseEvent('dblclick', 195));

      expect(host.sizeChangedEvents.length).toBe(0);
      expect(host.edgeDoubleClickedCount).toBe(1);
    });
  });

  // ── Destroy ──────────────────────────────────────────────────────────────

  describe('ngOnDestroy', () => {
    it('should remove edge CSS classes on destroy', () => {
      el.dispatchEvent(mouseEvent('mousemove', 195)); // add vr-edge-hover
      directive.ngOnDestroy();
      expect(el.classList.contains('vr-edge-hover')).toBe(false);
      expect(el.classList.contains('vr-edge-dragging')).toBe(false);
    });

    it('should stop emitting sizeChanged after destroy even if window mousemove fires', () => {
      el.dispatchEvent(mouseEvent('mousedown', 195));
      directive.ngOnDestroy(); // tears down listeners
      window.dispatchEvent(mouseEvent('mousemove', 250));
      expect(host.sizeChangedEvents.length).toBe(0);
    });
  });

  // ── NgZone ───────────────────────────────────────────────────────────────

  describe('zone handling', () => {
    it('should emit sizeChanged inside Angular zone', (done) => {
      let emittedInsideZone = false;
      directive.sizeChanged.subscribe(() => {
        emittedInsideZone = NgZone.isInAngularZone();
      });

      ngZone.runOutsideAngular(() => {
        el.dispatchEvent(mouseEvent('mousedown', 195));
        window.dispatchEvent(mouseEvent('mousemove', 220));
      });

      setTimeout(() => {
        expect(emittedInsideZone).toBe(true);
        done();
      }, 0);
    });

    it('should emit edgeDoubleClicked inside Angular zone', (done) => {
      let emittedInsideZone = false;
      directive.edgeDoubleClicked.subscribe(() => {
        emittedInsideZone = NgZone.isInAngularZone();
      });

      ngZone.runOutsideAngular(() => {
        el.dispatchEvent(mouseEvent('dblclick', 195));
      });

      setTimeout(() => {
        expect(emittedInsideZone).toBe(true);
        done();
      }, 0);
    });
  });
});
