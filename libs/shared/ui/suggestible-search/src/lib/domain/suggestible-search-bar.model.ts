/*
 * Copyright (c) 2023 FMR Corp.
 * All Rights Reserved.
 *
 * Fidelity Confidential Information.
 * Created on 10/12/23, 1:50 PM
 */

import {
  AnalystSuggestion,
  SecuritySuggestion,
  PorfolioSuggestion,
  IndexSuggestion,
} from '@fmr-pr000539/shared/data';

/**
 * This will be an union type of multiple interfaces as the models of Suggestible Search Bar grows
 */
export type SuggestibleSearchSuggestion =
  | SecuritySuggestion
  | AnalystSuggestion
  | PorfolioSuggestion
  | IndexSuggestion;
