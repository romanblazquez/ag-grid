/*
 * Copyright (c) 2024 FMR Corp.
 * All Rights Reserved.
 *
 * Fidelity Confidential Information.
 * Created on Nov 26, 2024
 */

import { DateRange, DateSelectionType } from '../date-range.model';

export interface DateRangeEvent {
  dateSelectionType: DateSelectionType;
  dateRange: DateRange;
}
