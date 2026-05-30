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
  selector: '[commonSearchCheckbox]',
  standalone: false,
})
export class CommonSearchCheckboxDirective {
  private readonly commonSearchStore = inject(CommonSearchStore);

  @HostListener('click')
  onClick(): void {
    this.commonSearchStore.updateInsertMethod(
      CommonSearchInteractionType.FromSelection,
    );
  }
}
