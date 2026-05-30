/*
 * Copyright (c) 2025 FMR Corp.
 * All Rights Reserved.
 *
 * Fidelity Confidential Information.
 */

import {
  Directive,
  ElementRef,
  EventEmitter,
  HostListener,
  NgZone,
  OnDestroy,
  OnInit,
  Output,
  Renderer2,
} from '@angular/core';

export interface SizeChangedEvent {
  height: number;
}

/**
 * Directive that adds a vertical resize handle to the bottom edge of an element.
 * Hovering near the bottom edge changes the cursor to `ns-resize` and allows
 * the user to drag to resize the element vertically.
 * Emits `(sizeChanged)` with the new height whenever the element is resized.
 * Emits `(edgeDoubleClicked)` when the bottom edge is double-clicked.
 *
 * Usage:
 * ```html
 * <div verticalResize (sizeChanged)="onSizeChanged($event)" (edgeDoubleClicked)="onEdgeDoubleClicked()">...</div>
 * ```
 */
@Directive({
  selector: '[verticalResize]',
  standalone: true,
})
export class VerticalResizeDirective implements OnInit, OnDestroy {
  /** Emits the new height (px) whenever the element is resized. */
  @Output() public sizeChanged = new EventEmitter<SizeChangedEvent>();

  /** Emits when the bottom edge is double-clicked. */
  @Output() public edgeDoubleClicked = new EventEmitter<void>();

  /** Pixel zone near bottom edge where the resize cursor/highlight activates. */
  private readonly edgeThreshold = 14;

  /** CSS classes toggled on the host element for visual feedback. */
  private readonly CSS_HOVER = 'vr-edge-hover';
  private readonly CSS_DRAGGING = 'vr-edge-dragging';

  private isDragging = false;
  private hasMoved = false;
  private startY = 0;
  private startHeight = 0;

  private unlistenMouseMove?: () => void;
  private unlistenMouseUp?: () => void;

  /** <style> node injected once into <head> for the pseudo-element highlight. */
  private static styleInjected = false;

  public constructor(
    private readonly el: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2,
    private readonly ngZone: NgZone,
  ) {}

  public ngOnInit(): void {
    const position = getComputedStyle(this.el.nativeElement).position;
    if (position === 'static') {
      this.renderer.setStyle(this.el.nativeElement, 'position', 'relative');
    }
    VerticalResizeDirective.injectStyles();
  }

  public ngOnDestroy(): void {
    this.removeGlobalListeners();
    this.clearEdgeClasses();
  }

  // ── Mouse move over the element ──────────────────────────────────────────

  @HostListener('mousemove', ['$event'])
  public onMouseMove(event: MouseEvent): void {
    if (this.isDragging) return;
    const onEdge = this.isOnBottomEdge(event);
    this.renderer.setStyle(
      this.el.nativeElement,
      'cursor',
      onEdge ? 'ns-resize' : '',
    );
    this.setClass(this.CSS_HOVER, onEdge);
  }

  @HostListener('mouseleave')
  public onMouseLeave(): void {
    if (!this.isDragging) {
      this.renderer.removeStyle(this.el.nativeElement, 'cursor');
      this.setClass(this.CSS_HOVER, false);
    }
  }

  // ── Double click on bottom edge ──────────────────────────────────────────

  @HostListener('dblclick', ['$event'])
  public onDoubleClick(event: MouseEvent): void {
    if (!this.isOnBottomEdge(event)) return;
    event.preventDefault();
    event.stopPropagation();
    this.ngZone.run(() => {
      this.edgeDoubleClicked.emit();
    });
  }

  // ── Drag start ───────────────────────────────────────────────────────────

  @HostListener('mousedown', ['$event'])
  public onMouseDown(event: MouseEvent): void {
    if (!this.isOnBottomEdge(event)) return;

    event.preventDefault();
    event.stopPropagation();

    this.isDragging = true;
    this.hasMoved = false;
    this.startY = event.clientY;
    this.startHeight = this.el.nativeElement.offsetHeight;

    this.setClass(this.CSS_HOVER, false);
    this.setClass(this.CSS_DRAGGING, true);

    this.ngZone.runOutsideAngular(() => {
      this.unlistenMouseMove = this.renderer.listen(
        'window',
        'mousemove',
        (e: MouseEvent) => this.onDragMove(e),
      );
      this.unlistenMouseUp = this.renderer.listen(
        'window',
        'mouseup',
        (e: MouseEvent) => this.onDragEnd(e),
      );
    });
  }

  // ── Drag move ────────────────────────────────────────────────────────────

  private onDragMove(event: MouseEvent): void {
    if (!this.isDragging) return;
    this.hasMoved = true;
    const delta = event.clientY - this.startY;
    const newHeight = Math.max(50, this.startHeight + delta);
    // Style write stays outside Angular zone — no change detection needed for this.
    this.renderer.setStyle(this.el.nativeElement, 'height', `${newHeight}px`);
    // Emit inside zone so parent bindings (e.g. ag-grid row height) update each frame.
    this.ngZone.run(() => {
      this.sizeChanged.emit({ height: newHeight });
    });
  }

  // ── Drag end ─────────────────────────────────────────────────────────────

  private onDragEnd(event: MouseEvent): void {
    if (!this.isDragging) return;

    this.isDragging = false;
    this.removeGlobalListeners();
    this.renderer.removeStyle(this.el.nativeElement, 'cursor');
    this.setClass(this.CSS_DRAGGING, false);

    if (!this.hasMoved) return;

    const finalHeight = this.el.nativeElement.offsetHeight;
    this.ngZone.run(() => {
      this.sizeChanged.emit({ height: finalHeight });
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private isOnBottomEdge(event: MouseEvent): boolean {
    const rect = this.el.nativeElement.getBoundingClientRect();
    return event.clientY >= rect.bottom - this.edgeThreshold;
  }

  private setClass(cls: string, add: boolean): void {
    if (add) {
      this.renderer.addClass(this.el.nativeElement, cls);
    } else {
      this.renderer.removeClass(this.el.nativeElement, cls);
    }
  }

  private clearEdgeClasses(): void {
    this.setClass(this.CSS_HOVER, false);
    this.setClass(this.CSS_DRAGGING, false);
  }

  private removeGlobalListeners(): void {
    this.unlistenMouseMove?.();
    this.unlistenMouseUp?.();
    this.unlistenMouseMove = undefined;
    this.unlistenMouseUp = undefined;
  }

  /**
   * Injects a single <style> block into <head> that uses ::after pseudo-elements
   * to render the bottom-edge highlight.  Only runs once across all instances.
   */
  private static injectStyles(): void {
    if (VerticalResizeDirective.styleInjected) return;
    VerticalResizeDirective.styleInjected = true;

    const css = `
      /* verticalResize directive – bottom edge highlight */
      .vr-edge-hover::after,
      .vr-edge-dragging::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 4px;
        pointer-events: none;
        border-radius: 2px;
        transition: background 0.15s ease, opacity 0.15s ease;
      }
      .vr-edge-hover::after {
        background: var(--p-primary-500, #5b9bd5);
        opacity: 0.7;
      }
      .vr-edge-dragging::after {
        background: #5b9bd5;
        opacity: 1;
        height: 4px;
        box-shadow: 0 0 6px 1px rgba(33, 150, 243, 0.6);
      }
    `;

    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }
}
