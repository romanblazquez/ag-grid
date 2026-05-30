import { ApiName } from './service-config.model';
import { ChipContext } from '@trade-platform/shared/ui/selection-chips';
import { PreferenceContext } from './preference-context.model';

export interface Context {
  apiNames?: Array<ApiName>;
  requestBody?: object;
  headers?: object;
  initLoadData: boolean;
  showAll?: boolean;
  detailFields: Array<{ name: string; visible: boolean }>;
  detailHeaders: Array<string>;
  fieldWidths: Record<string, number>;
  panelWidth: number;
  emitField: string;
  isTreeView?: boolean;
  treeAttributes?: Record<number, Array<string>>;
  placeholder: string;
  inputWidth?: string;
  errorMessage: string;
  multiselect?: boolean;
  chipContext?: ChipContext;
  preferenceContext?: PreferenceContext;
}
