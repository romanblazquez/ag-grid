/*
 * Copyright (c) 2023 FMR Corp.
 * All Rights Reserved.
 *
 * Fidelity Confidential Information.
 * Created on 10/12/23, 1:51 PM
 */

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  MAT_AUTOCOMPLETE_DEFAULT_OPTIONS,
  MatAutocompleteModule,
} from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatGridListModule } from '@angular/material/grid-list';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonSearchComponent } from './common-search/common-search.component';
import { SolarConfigService } from './data-access/solar-config.service';
import { HttpClientModule } from '@angular/common/http';
import { TreeViewResultComponent } from './ui/tree-view-result/tree-view-result.component';
import { MatTreeModule } from '@angular/material/tree';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import {
  ErrorStateMatcher,
  ShowOnDirtyErrorStateMatcher,
} from '@angular/material/core';
import { GridViewResultComponent } from './ui/grid-view-result/grid-view-result.component';
import { BrokersService } from './data-access/services/broker.service';
import { PortfolioService } from './data-access/services/portfolio.service';
import { DataAccessFacadeService } from './data-access/data-access-facade.service';
import { ParentBrokerSearchService } from './data-access/services/parent-broker-search.service';
import { PersonDirectoryService } from './data-access/services/person-directory.service';
import { CodeValueService } from './data-access/services/codevalue.service';
import { PersonSearchService } from './data-access/services/person-search.service';
import { SecurityService } from './data-access/services/security.service';
import { CommonSearchTooltipDirective } from './ui/shared/common-search-tooltip.directive';
import { CommonSearchCheckboxDirective } from './ui/shared/common-search-checkbox.directive';
import { CommonSearchInputDirective } from './ui/shared/common-search-input.directive';
import { TeamSearchService } from './data-access/services/team-search.service';
import { TraderTeamSearchService } from './data-access/services/trader-team-search.service';
import { PersonService } from './model/person.model';

@NgModule({
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
    HttpClientModule,
    MatCheckboxModule,
    MatTreeModule,
    MatButtonModule,
  ],
  declarations: [
    CommonSearchComponent,
    TreeViewResultComponent,
    GridViewResultComponent,
    CommonSearchTooltipDirective,
    CommonSearchCheckboxDirective,
    CommonSearchInputDirective,
  ],
  exports: [CommonSearchComponent],
  providers: [
    SolarConfigService,
    BrokersService,
    PortfolioService,
    ParentBrokerSearchService,
    PersonDirectoryService,
    CodeValueService,
    DataAccessFacadeService,
    PersonSearchService,
    SecurityService,
    TeamSearchService,
    TraderTeamSearchService,
    { provide: PersonService, useExisting: PersonDirectoryService },
    { provide: ErrorStateMatcher, useClass: ShowOnDirtyErrorStateMatcher },
    {
      provide: MAT_AUTOCOMPLETE_DEFAULT_OPTIONS,
      useValue: { overlayPanelClass: 'autcomplete-overlay-pane' },
    },
  ],
})
export class SharedUiCommonSearchModule {}
