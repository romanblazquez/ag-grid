/*
 * Copyright (c) 2025 FMR Corp.
 * All Rights Reserved.
 *
 * Fidelity Confidential Information.
 * Created on Jul 25, 2025
 */

import { Directive, HostListener, inject } from '@angular/core';
import { CommonSearchStore } from '../../data-access/store/common-search.store';
import { CommonSearchInteractionType } from '../../model/common-search-interaction-type.enum';

@Directive({
  selector: '[commonSearchInput]',
  standalone: false,
})
export class CommonSearchInputDirective {
  private readonly commonSearchStore = inject(CommonSearchStore);

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const interactionType = this.getInteractionFromEvent(event as InputEvent);
    this.commonSearchStore.updateInsertMethod(interactionType);
  }

  private getInteractionFromEvent(
    event: InputEvent,
  ): CommonSearchInteractionType {
    switch (event.inputType) {
      case 'insertText':
        return CommonSearchInteractionType.FromTyping;
      case 'insertFromPaste':
        return CommonSearchInteractionType.FromPaste;
      default:
        return CommonSearchInteractionType.FromSelection;
    }
  }
}
