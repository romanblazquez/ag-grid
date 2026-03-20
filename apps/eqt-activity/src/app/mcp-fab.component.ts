import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { McpServerService } from './mcp-server.service';

interface Anchor {
  path: string;
  symbol: string | null;
  content: string;
  startLine: number;
  endLine: number;
}

@Component({
  selector: 'app-mcp-fab',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Floating Action Button -->
    <button
      class="mcp-fab"
      [class.mcp-fab--active]="open()"
      (click)="toggle()"
      title="UI Anchors — MCP"
      aria-label="Open MCP panel"
    >
      {{ open() ? '✕' : '🧭' }}
    </button>

    <!-- Side panel -->
    <aside class="mcp-panel" [class.mcp-panel--open]="open()">
      <header class="mcp-panel__header">
        <span>🔍 UI Anchors</span>
        <small>via MCP Server</small>
      </header>

      <div class="mcp-panel__body">
        <button class="mcp-btn mcp-btn--primary" (click)="loadAnchors()" [disabled]="loading()">
          {{ loading() ? 'Loading…' : 'Fetch UI Anchors' }}
        </button>

        <div *ngIf="error()" class="mcp-error">⚠ {{ error() }}</div>

        <div *ngIf="anchors().length > 0" class="mcp-anchors">
          <p class="mcp-anchors__count">{{ anchors().length }} anchors found</p>
          <div *ngFor="let a of anchors(); let i = index" class="mcp-anchor-card">
            <div class="mcp-anchor-card__header">
              <span class="mcp-anchor-card__index">#{{ i + 1 }}</span>
              <code class="mcp-anchor-card__path">{{ shortPath(a.path) }}</code>
              <span class="mcp-anchor-card__lines">L{{ a.startLine }}–{{ a.endLine }}</span>
            </div>
            <div *ngIf="a.symbol" class="mcp-anchor-card__symbol">{{ a.symbol }}</div>
            <pre class="mcp-anchor-card__preview">{{ a.content | slice:0:200 }}{{ a.content.length > 200 ? '…' : '' }}</pre>
          </div>
        </div>
      </div>
    </aside>

    <!-- Backdrop -->
    <div *ngIf="open()" class="mcp-backdrop" (click)="toggle()"></div>
  `,
  styles: [`
    .mcp-fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 1100;
      background: #1565c0;
      color: #fff;
      border: none;
      border-radius: 50%;
      width: 52px;
      height: 52px;
      font-size: 1.4rem;
      line-height: 1;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      cursor: pointer;
      transition: background 0.2s, transform 0.2s;
    }
    .mcp-fab:hover { background: #1976d2; transform: scale(1.08); }
    .mcp-fab--active { background: #424242; }

    .mcp-backdrop {
      position: fixed; inset: 0; z-index: 1050;
    }

    .mcp-panel {
      position: fixed;
      bottom: 88px;
      right: 24px;
      width: 380px;
      max-height: 70vh;
      background: #1e1e2e;
      color: #cdd6f4;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      display: flex;
      flex-direction: column;
      z-index: 1080;
      opacity: 0;
      transform: translateY(16px) scale(0.97);
      pointer-events: none;
      transition: opacity 0.2s, transform 0.2s;
    }
    .mcp-panel--open {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: all;
    }

    .mcp-panel__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px 10px;
      border-bottom: 1px solid #313244;
      font-weight: 600;
      font-size: 0.95rem;
      letter-spacing: 0.02em;
    }
    .mcp-panel__header small { color: #6c7086; font-weight: 400; font-size: 0.75rem; }

    .mcp-panel__body {
      overflow-y: auto;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .mcp-btn {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      transition: background 0.15s;
    }
    .mcp-btn--primary { background: #1976d2; color: #fff; }
    .mcp-btn--primary:hover:not(:disabled) { background: #1565c0; }
    .mcp-btn--primary:disabled { opacity: 0.5; cursor: not-allowed; }

    .mcp-error {
      background: #3e1f1f;
      color: #f38ba8;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 0.8rem;
    }

    .mcp-anchors__count {
      margin: 0;
      color: #a6e3a1;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .mcp-anchor-card {
      background: #181825;
      border: 1px solid #313244;
      border-radius: 8px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .mcp-anchor-card__header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.78rem;
    }
    .mcp-anchor-card__index {
      color: #6c7086;
      min-width: 24px;
    }
    .mcp-anchor-card__path {
      flex: 1;
      color: #89b4fa;
      font-size: 0.73rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .mcp-anchor-card__lines {
      color: #6c7086;
      font-size: 0.72rem;
      white-space: nowrap;
    }
    .mcp-anchor-card__symbol {
      color: #cba6f7;
      font-size: 0.78rem;
      font-style: italic;
    }
    .mcp-anchor-card__preview {
      margin: 0;
      background: #11111b;
      color: #a6adc8;
      font-size: 0.72rem;
      padding: 6px 8px;
      border-radius: 4px;
      white-space: pre-wrap;
      word-break: break-all;
      max-height: 80px;
      overflow: hidden;
    }
  `]
})
export class McpFabComponent {
  open = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);
  anchors = signal<Anchor[]>([]);

  constructor(private mcp: McpServerService) {}

  toggle() {
    this.open.update(v => !v);
  }

  loadAnchors() {
    this.loading.set(true);
    this.error.set(null);
    this.mcp.getUiAnchors().subscribe({
      next: res => {
        this.anchors.set(res.anchors ?? []);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err.message || 'Failed to reach MCP server');
        this.loading.set(false);
      }
    });
  }

  shortPath(path: string): string {
    const parts = path.split('/');
    return parts.length > 3 ? '…/' + parts.slice(-2).join('/') : path;
  }
}
