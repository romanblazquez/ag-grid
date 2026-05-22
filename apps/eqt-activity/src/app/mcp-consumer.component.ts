import { Component, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Shepherd from 'shepherd.js';
import { McpServerService } from './mcp-server.service';

interface TourStep {
  selector: string;
  title: string;
  text: string;
  action?: {
    type: string;
    target?: string;
    instruction: string;
    event?: string;
  };
}

interface MatchedComponent {
  selector: string;
  path: string;
  symbol: string | null;
  domCount: number;
  inDom: boolean;
}

@Component({
  selector: 'app-mcp-consumer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Trigger button -->
    <button class="mcp-search-trigger" (click)="openPalette()" title="Highlight components via MCP (Cmd+K)" aria-label="Open MCP panel">
      🔍
    </button>

    <!-- Backdrop -->
    <div *ngIf="open()" class="mcp-palette-backdrop" (click)="closePalette()"></div>

    <!-- Command palette -->
    <div *ngIf="open()" class="mcp-palette" role="dialog" aria-label="Component search">
      <div class="mcp-palette__input-row">
        <span class="mcp-palette__icon">🔍</span>
        <input
          class="mcp-palette__input"
          [(ngModel)]="query"
          (keyup.enter)="search()"
          placeholder="Describe a component or feature to highlight…"
          autofocus
        />
        <button class="mcp-palette__btn" (click)="search()" [disabled]="loading()">
          {{ loading() ? '…' : 'Go' }}
        </button>
        <button *ngIf="matches().length" class="mcp-palette__clear-btn" (click)="clearHighlights()" title="Clear highlights">✕</button>
      </div>

      <!-- Agent explanation -->
      <div *ngIf="explanation()" [class]="'mcp-palette__explanation' + (isFallback() ? ' mcp-palette__explanation--fallback' : '')">
        {{ isFallback() ? '⚠' : '💡' }} {{ explanation() }}
      </div>

      <!-- Results -->
      <div *ngIf="matches().length" class="mcp-palette__results">
        <div class="mcp-palette__results-header" *ngIf="highlightCount() > 0">
          ✅ {{ highlightCount() }} element(s) highlighted · {{ domMatches().length }} type(s) visible
          <button *ngIf="tourSteps().length" class="mcp-palette__tour-btn" (click)="startTour()" title="Walk through each component with a guided tour">
            🗺 Start Tour ({{ tourSteps().length }} steps)
          </button>
        </div>
        <div class="mcp-palette__results-header mcp-palette__results-header--warn" *ngIf="highlightCount() === 0">
          ⚠ Found {{ matches().length }} component(s) in code — none rendered in current view
          <button *ngIf="tourSteps().length" class="mcp-palette__tour-btn" (click)="startTour()" title="Walk through each component with a guided tour">
            🗺 Start Tour ({{ tourSteps().length }} steps)
          </button>
        </div>

        <div *ngFor="let m of domMatches()" class="mcp-palette__result mcp-palette__result--active">
          <code class="mcp-palette__selector">&lt;{{ m.selector }}&gt;</code>
          <span class="mcp-palette__count">{{ m.domCount }}×</span>
          <small class="mcp-palette__path">{{ shortPath(m.path) }}<span *ngIf="m.symbol"> · {{ m.symbol }}</span></small>
        </div>

        <ng-container *ngIf="codeOnlyMatches().length">
          <div class="mcp-palette__section-label">Found in code — not in current view</div>
          <div *ngFor="let m of codeOnlyMatches()" class="mcp-palette__result mcp-palette__result--code-only">
            <code class="mcp-palette__selector">&lt;{{ m.selector }}&gt;</code>
            <span class="mcp-palette__count muted">—</span>
            <small class="mcp-palette__path">{{ shortPath(m.path) }}<span *ngIf="m.symbol"> · {{ m.symbol }}</span></small>
          </div>
        </ng-container>
      </div>

      <div *ngIf="!loading() && searched() && !matches().length && !error()" class="mcp-palette__empty">
        No components found for "{{ lastQuery() }}"
      </div>
      <div *ngIf="error()" class="mcp-palette__error">⚠ {{ error() }}</div>
    </div>
  `,
  styles: [`
    .mcp-search-trigger {
      position: fixed; bottom: 88px; right: 24px; z-index: 1100;
      background: #2e7d32; color: #fff; border: none; border-radius: 50%;
      width: 52px; height: 52px; font-size: 1.3rem;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3); cursor: pointer;
      transition: background 0.2s, transform 0.2s;
    }
    .mcp-search-trigger:hover { background: #388e3c; transform: scale(1.08); }

    .mcp-palette-backdrop { position: fixed; inset: 0; z-index: 1110; background: rgba(0,0,0,0.5); backdrop-filter: blur(2px); }

    .mcp-palette {
      position: fixed; top: 18%; left: 50%; transform: translateX(-50%);
      width: min(580px, 92vw); background: #1e1e2e; color: #cdd6f4;
      border-radius: 14px; box-shadow: 0 20px 60px rgba(0,0,0,0.6);
      z-index: 1120; overflow: hidden; font-family: system-ui, sans-serif;
    }
    .mcp-palette__input-row {
      display: flex; align-items: center; gap: 10px;
      padding: 14px 16px; border-bottom: 1px solid #313244;
    }
    .mcp-palette__icon { font-size: 1.1rem; flex-shrink: 0; }
    .mcp-palette__input {
      flex: 1; background: transparent; border: none; outline: none;
      color: #cdd6f4; font-size: 1rem;
    }
    .mcp-palette__input::placeholder { color: #45475a; }
    .mcp-palette__btn {
      background: #1976d2; color: #fff; border: none; border-radius: 6px;
      padding: 6px 16px; cursor: pointer; font-size: 0.875rem; font-weight: 500;
      flex-shrink: 0; transition: background 0.15s;
    }
    .mcp-palette__btn:hover:not(:disabled) { background: #1565c0; }
    .mcp-palette__btn:disabled { opacity: 0.45; cursor: not-allowed; }
    .mcp-palette__clear-btn {
      background: none; border: 1px solid #45475a; color: #a6adc8;
      border-radius: 50%; width: 28px; height: 28px; cursor: pointer; font-size: 0.8rem; flex-shrink: 0;
    }
    .mcp-palette__explanation {
      padding: 10px 16px; font-size: 0.8rem; color: #a6e3a1;
      border-bottom: 1px solid #313244; line-height: 1.5;
    }
    .mcp-palette__explanation--fallback { color: #fab387; }
    .mcp-palette__results {
      padding: 12px 16px; display: flex; flex-direction: column;
      gap: 6px; max-height: 320px; overflow-y: auto;
    }
    .mcp-palette__results-header {
      font-size: 0.78rem; color: #a6e3a1; padding-bottom: 6px;
      border-bottom: 1px solid #313244; margin-bottom: 4px;
    }
    .mcp-palette__results-header--warn { color: #fab387; }
    .mcp-palette__tour-btn {
      margin-left: auto; display: block; margin-top: 6px;
      background: #313244; color: #89b4fa; border: 1px solid #89b4fa;
      border-radius: 6px; padding: 4px 12px; font-size: 0.78rem;
      cursor: pointer; transition: background 0.15s;
    }
    .mcp-palette__tour-btn:hover { background: #1a1a2e; }
    .mcp-palette__result {
      display: grid; grid-template-columns: 1fr auto; grid-template-rows: auto auto;
      gap: 2px 8px; background: #181825; border: 1px solid #313244;
      border-left: 3px solid #89b4fa; border-radius: 6px; padding: 8px 10px;
    }
    .mcp-palette__result--code-only { border-left-color: #45475a; opacity: 0.65; }
    .mcp-palette__section-label {
      font-size: 0.72rem; color: #6c7086; padding: 6px 2px 2px;
      letter-spacing: 0.04em; text-transform: uppercase;
    }
    .mcp-palette__selector { color: #89b4fa; font-size: 0.85rem; }
    .mcp-palette__count { color: #a6e3a1; font-weight: 700; font-size: 0.8rem; text-align: right; align-self: center; }
    .mcp-palette__count.muted { color: #45475a; }
    .mcp-palette__path { color: #6c7086; font-size: 0.72rem; grid-column: 1 / -1; }
    .mcp-palette__empty { padding: 16px; color: #6c7086; font-size: 0.85rem; text-align: center; }
    .mcp-palette__error { padding: 12px 16px; color: #f38ba8; font-size: 0.85rem; }
  `]
})
export class McpConsumerComponent implements OnDestroy {
  open = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);
  matches = signal<MatchedComponent[]>([]);
  explanation = signal<string>('');
  isFallback = signal(false);
  searched = signal(false);
  lastQuery = signal('');
  tourSteps = signal<TourStep[]>([]);

  highlightCount = computed(() => this.matches().reduce((sum, m) => sum + m.domCount, 0));
  domMatches = computed(() => this.matches().filter(m => m.inDom));
  codeOnlyMatches = computed(() => this.matches().filter(m => !m.inDom));

  query = '';
  private highlightEls: HTMLElement[] = [];
  private activeTour: InstanceType<typeof Shepherd.Tour> | null = null;

  constructor(private mcp: McpServerService) {}

  openPalette() { this.open.set(true); }
  closePalette() { this.open.set(false); }

  search() {
    if (!this.query.trim()) return;
    this.loading.set(true);
    this.error.set(null);
    this.searched.set(false);
    this.explanation.set('');
    this.isFallback.set(false);
    this.lastQuery.set(this.query);
    this.clearHighlights();

    const liveTags = this.getLiveDomTags();

    this.mcp.agentSmart(this.query, liveTags).subscribe({
      next: ({ selectors, explanation, steps, fallback }: { selectors: string[]; explanation: string; steps?: TourStep[]; fallback?: boolean }) => {
        this.explanation.set(explanation);
        this.isFallback.set(!!fallback);
        // Capture tour steps returned by the agent (ordered for a logical journey)
        this.tourSteps.set(steps ?? []);
        const matched: MatchedComponent[] = selectors.map((selector: string) => {
          // Strip angle brackets the LLM sometimes wraps selectors in: "<lib-foo>" → "lib-foo"
          const cleanSelector = selector.replace(/^<|>$/g, '');
          let elements: HTMLElement[] = [];
          try {
            elements = Array.from(document.querySelectorAll(cleanSelector)) as HTMLElement[];
          } catch { /* invalid selector — skip */ }
          if (elements.length) elements.forEach(el => this.addHighlight(el, cleanSelector));
          return { selector: cleanSelector, path: '', symbol: null, domCount: elements.length, inDom: elements.length > 0 };
        }).sort((a: MatchedComponent, b: MatchedComponent) => Number(b.inDom) - Number(a.inDom));
        this.matches.set(matched);
        this.searched.set(true);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err.error?.error || err.message || 'Agent error');
        this.loading.set(false);
      }
    });
  }

  private getLiveDomTags(): string[] {
    const tags = new Set<string>();
    document.querySelectorAll('*').forEach(el => {
      const tag = el.tagName.toLowerCase();
      if (tag.includes('-') && !['ng-container', 'ng-template', 'ng-content'].includes(tag)) {
        tags.add(tag);
      }
    });
    return [...tags];
  }

  private addHighlight(el: HTMLElement, label: string) {
    this.ensureStyles();
    const rect = el.getBoundingClientRect();
    const overlay = document.createElement('div');
    overlay.className = 'mcp-hl';
    overlay.style.cssText = `
      position: fixed;
      top: ${rect.top}px; left: ${rect.left}px;
      width: ${rect.width}px; height: ${rect.height}px;
      border: 2px solid #89b4fa; border-radius: 4px;
      pointer-events: none; z-index: 9998;
    `;
    const badge = document.createElement('span');
    badge.style.cssText = `
      position: absolute; top: -22px; left: 0;
      background: #1e1e2e; color: #89b4fa;
      font: 600 11px/1 monospace; padding: 3px 7px;
      border-radius: 4px; border: 1px solid #89b4fa;
      white-space: nowrap; pointer-events: none;
    `;
    badge.textContent = `<${label}>`;
    overlay.appendChild(badge);
    document.body.appendChild(overlay);
    this.highlightEls.push(overlay);
  }

  private ensureStyles() {
    if (document.getElementById('mcp-hl-styles')) return;
    const style = document.createElement('style');
    style.id = 'mcp-hl-styles';
    style.textContent = `
      .mcp-hl { animation: mcp-pulse 2s ease-in-out infinite; }
      @keyframes mcp-pulse {
        0%, 100% { box-shadow: 0 0 0 3px rgba(137,180,250,0.1); }
        50%       { box-shadow: 0 0 0 8px rgba(137,180,250,0.3); }
      }
    `;
    document.head.appendChild(style);
  }

  startTour() {
    const steps = this.tourSteps();
    if (!steps.length) return;

    // Close the command palette so the tour steps are visible
    this.open.set(false);
    this.clearHighlights();

    // Destroy any previously running tour
    if (this.activeTour) {
      this.activeTour.cancel();
      this.activeTour = null;
    }

    const tour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        scrollTo: { behavior: 'smooth', block: 'center' },
        cancelIcon: { enabled: true },
        classes: 'shepherd-theme-dark',
        modalOverlayOpeningPadding: 6,
        modalOverlayOpeningRadius: 6,
      },
    });

    steps.forEach((step, index) => {
      const isFirst = index === 0;
      const isLast = index === steps.length - 1;
      const cleanSelector = step.selector.replace(/^<|>$/g, '');
      let el: Element | null = null;
      try { el = document.querySelector(cleanSelector); } catch { /* invalid */ }

      const hasAction = !!step.action;
      const actionTarget = step.action?.target
        ? step.action.target.replace(/^<|>$/g, '')
        : cleanSelector;
      const actionEvent = step.action?.event || (step.action?.type === 'input' ? 'change' : 'click');

      // Build step text — append action instruction callout if present
      let stepText = step.text;
      if (hasAction) {
        stepText += `<div class="shepherd-action-prompt">` +
          `<span class="shepherd-action-icon">👆</span> ` +
          `<strong>${step.action!.instruction}</strong>` +
          `<div class="shepherd-action-hint">Interact with the UI, then click "Continue →" or the action will auto-advance.</div>` +
          `</div>`;
      }

      const buttons: object[] = [];
      if (!isFirst) {
        buttons.push({ text: '← Back', action: () => tour.back(), classes: 'shepherd-button-secondary' });
      }
      if (hasAction && !isLast) {
        buttons.push({ text: 'Skip →', action: () => tour.next(), classes: 'shepherd-button-secondary' });
        buttons.push({ text: 'Continue →', action: () => tour.next() });
      } else if (!isLast) {
        buttons.push({ text: 'Next →', action: () => tour.next() });
      } else {
        buttons.push({ text: 'Finish ✓', action: () => tour.complete() });
      }

      const stepOptions: Record<string, unknown> = {
        id: `step-${index}`,
        title: `<span style="font-size:0.7rem;color:#6c7086;font-weight:400">${index + 1} / ${steps.length}</span>&nbsp; ${step.title}`,
        text: stepText,
        buttons,
      };

      if (el) {
        stepOptions['attachTo'] = { element: cleanSelector, on: 'bottom' };
      }

      // For interactive steps: unlock the overlay so the user can click through
      if (hasAction) {
        stepOptions['modalOverlayOpeningPadding'] = 12;
        stepOptions['modalOverlayOpeningRadius'] = 8;
        stepOptions['canClickTarget'] = true;
        // Auto-advance when the user performs the action on the target element
        stepOptions['advanceOn'] = { selector: actionTarget, event: actionEvent };
      }

      tour.addStep(stepOptions);
    });

    tour.on('complete', () => { this.activeTour = null; });
    tour.on('cancel', () => { this.activeTour = null; });

    this.activeTour = tour;
    tour.start();
  }

  clearHighlights() {
    this.highlightEls.forEach(el => el.remove());
    this.highlightEls = [];
    this.matches.set([]);
    this.explanation.set('');
    this.isFallback.set(false);
    this.searched.set(false);
    this.tourSteps.set([]);
  }

  shortPath(path: string): string {
    if (!path) return '';
    const parts = path.split('/');
    return parts.length > 3 ? '…/' + parts.slice(-2).join('/') : path;
  }

  ngOnDestroy() {
    if (this.activeTour) {
      this.activeTour.cancel();
      this.activeTour = null;
    }
    this.clearHighlights();
    document.getElementById('mcp-hl-styles')?.remove();
  }
}
