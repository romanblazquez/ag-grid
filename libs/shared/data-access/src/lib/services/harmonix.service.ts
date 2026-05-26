import { Injectable, signal } from '@angular/core';

export interface ThemeInfo {
  name: 'dark' | 'light' | 'high-contrast';
}

export interface HarmonixContext {
  type: string;
  [key: string]: unknown;
}

export interface TradeContext extends HarmonixContext {
  type: 'fdc3.trade';
  id: { entityId: string; entityType: EntityType };
  product?: { id: { entityId: string }; type: string };
}

export interface TradeListContext extends HarmonixContext {
  type: 'fdc3.tradeList';
  trades: TradeContext[];
}

export enum EntityType {
  TRADE = 'T',
  EXECUTION = 'E',
}

/**
 * Stub for the proprietary HarmonixService (workspace context / intent raising).
 * In the real app this would be provided by the Harmonix desktop integration.
 */
@Injectable({ providedIn: 'root' })
export class HarmonixService {
  public readonly theme = signal<ThemeInfo>({ name: 'dark' });

  public async raiseIntent(
    intentName: string,
    context: HarmonixContext,
  ): Promise<void> {
    console.log(`[HarmonixService] raiseIntent: ${intentName}`, context);
  }

  public async showNotification(message: string): Promise<void> {
    console.log(`[HarmonixService] showNotification: ${message}`);
  }

  public updateWorkspaceContext(context: HarmonixContext): void {
    console.log('[HarmonixService] updateWorkspaceContext', context);
  }
}

/**
 * Sets the workspace context via the harmonix service.
 * No-op if the service call fails.
 */
export function setWorkspaceContext(
  service: HarmonixService,
  context: HarmonixContext,
): void {
  try {
    service.updateWorkspaceContext(context);
  } catch {
    // silently ignore
  }
}
