import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';

/**
 * Coordinates "only one panel open at a time" within a form group. When a
 * panel acquires the slot, the previously held panel is asked to close so
 * that two `lib-hds-common-search` instances don't fan out their megamenus
 * simultaneously.
 *
 * Keyed by `FormGroup` instance via a WeakMap so groups GC normally. Panels
 * without a form group don't participate.
 */
@Injectable({ providedIn: 'root' })
export class PanelCoordinatorService {
  private readonly openPanels = new WeakMap<
    FormGroup,
    { token: symbol; close: () => void }
  >();

  acquire(formGroup: FormGroup, close: () => void): symbol {
    const token = Symbol('panel');
    const existing = this.openPanels.get(formGroup);
    // Install the new holder before invoking the old one's close, so a
    // re-entrant `release` from the displaced panel can't accidentally
    // remove our brand-new entry.
    this.openPanels.set(formGroup, { token, close });
    if (existing) existing.close();
    return token;
  }

  release(formGroup: FormGroup, token: symbol): void {
    const existing = this.openPanels.get(formGroup);
    if (existing?.token === token) this.openPanels.delete(formGroup);
  }
}
