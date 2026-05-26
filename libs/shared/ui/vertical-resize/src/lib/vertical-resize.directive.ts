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
  @Output() public sizeChanged = new EventEmitter<SizeChangedEvent>();
  @Output() public edgeDoubleClicked = new EventEmitter<void>();

  private readonly edgeThreshold = 14;
  private readonly CSS_HOVER = 'vr-edge-hover';
  private readonly CSS_DRAGGING = 'vr-edge-dragging';

  private isDragging = false;
  private hasMoved = false;
  private startY = 0;
  private startHeight = 0;

  private unlistenMouseMove?: () => void;
  private unlistenMouseUp?: () => void;

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

  @HostListener('mousemove', ['$event'])
  public onMouseMove(event: MouseEvent): void {
    if (this.isDragging) return;
    const onEdge = this.isOnBottomEdge(event);
    this.renderer.setStyle(this.el.nativeElement, 'cursor', onEdge ? 'ns-resize' : '');
    this.setClass(this.CSS_HOVER, onEdge);
  }

  @HostListener('mouseleave')
  public onMouseLeave(): void {
    if (!this.isDragging) {
      this.renderer.removeStyle(this.el.nativeElement, 'cursor');
      this.setClass(this.CSS_HOVER, false);
    }
  }

  @HostListener('dblclick', ['$event'])
  public onDoubleClick(event: MouseEvent): void {
    if (!this.isOnBottomEdge(event)) return;
    event.preventDefault();
    event.stopPropagation();
    this.ngZone.run(() => {
      this.edgeDoubleClicked.emit();
    });
  }

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

  private onDragMove(event: MouseEvent): void {
    if (!this.isDragging) return;
    this.hasMoved = true;
    const delta = event.clientY - this.startY;
    const newHeight = Math.max(50, this.startHeight + delta);
    this.renderer.setStyle(this.el.nativeElement, 'height', `${newHeight}px`);
    this.ngZone.run(() => {
      this.sizeChanged.emit({ height: newHeight });
    });
  }

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
    if (this.unlistenMouseMove) {
      this.unlistenMouseMove();
      this.unlistenMouseMove = undefined;
    }
    if (this.unlistenMouseUp) {
      this.unlistenMouseUp();
      this.unlistenMouseUp = undefined;
    }
  }

  private static injectStyles(): void {
    if (VerticalResizeDirective.styleInjected) return;
    VerticalResizeDirective.styleInjected = true;
    const style = document.createElement('style');
    style.textContent = `
      .vr-edge-hover::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: ${14}px;
        background: rgba(99, 102, 241, 0.15);
        pointer-events: none;
        transition: background 0.15s;
      }
      .vr-edge-dragging {
        user-select: none;
      }
      .vr-edge-dragging::after {
        background: rgba(99, 102, 241, 0.3);
      }
    `;
    document.head.appendChild(style);
  }
}
