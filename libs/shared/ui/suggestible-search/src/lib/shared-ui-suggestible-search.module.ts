/*
 * Copyright (c) 2023 FMR Corp.
 * All Rights Reserved.
 *
 * Fidelity Confidential Information.
 * Created on 10/12/23, 1:51 PM
 */

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SuggestibleSearchComponent } from './suggestible-search/suggestible-search.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatGridListModule } from '@angular/material/grid-list';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedUiSearchBarModule } from '@fmr-pr000539/shared/ui/search-bar';

@NgModule({
  declarations: [SuggestibleSearchComponent],
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatIconModule,
    MatTooltipModule,
    MatGridListModule,
    FormsModule,
    ReactiveFormsModule,
    SharedUiSearchBarModule,
  ],
  exports: [SuggestibleSearchComponent],
})
export class SharedUiSuggestibleSearchModule {}
