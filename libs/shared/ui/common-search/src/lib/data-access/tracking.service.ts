import { Injectable } from '@angular/core';

export enum TrackingEventName {
  FilterModified = 'FilterModified',
  SearchClicked = 'SearchClicked',
  ClearParamsClicked = 'ClearParamsClicked',
}

export interface TrackingEvent {
  action: TrackingEventName | string;
  appModule: string;
  additionalAttributes?: Record<string, unknown>;
}

/**
 * Lightweight tracking sink. Replaces the proprietary eqt-tracking-module
 * referenced by the source code. In production swap with a real analytics
 * SDK (Adobe, Segment, etc.) — the surface stays the same.
 */
@Injectable({ providedIn: 'root' })
export class TrackingService {
  trackEvent(event: TrackingEvent): void {
    // eslint-disable-next-line no-console
    console.debug('[tracking]', event.action, event);
  }
}
