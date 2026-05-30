/*
 * Copyright (c) 2025 FMR Corp.
 * All Rights Reserved.
 *
 * Fidelity Confidential Information.
 * Created on Jul 23, 2025
 */

import { FormControl } from '@angular/forms';

export interface DatePickerForm {
  startDate: FormControl<Date | null>;
  endDate: FormControl<Date | null>;
}
