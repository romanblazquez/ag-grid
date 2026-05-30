/*
 * Copyright (c) 2025 FMR Corp.
 * All Rights Reserved.
 *
 * Fidelity Confidential Information.
 */

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { SelectionChipsComponent } from './selection-chips/selection-chips.component';
import { CdkConnectedOverlay, CdkOverlayOrigin } from '@angular/cdk/overlay';
import { MatCardModule } from '@angular/material/card';

@NgModule({
  imports: [
    CommonModule,
    MatChipsModule,
    MatIconModule,
    CdkConnectedOverlay,
    MatCardModule,
    CdkOverlayOrigin,
  ],
  declarations: [SelectionChipsComponent],
  exports: [SelectionChipsComponent],
})
export class SharedUiSelectionChipsModule {}
