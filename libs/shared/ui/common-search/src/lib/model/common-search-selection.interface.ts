import { AbstractData } from './solr-response.model';

export interface CommonSearchSelection {
  data: AbstractData[];
  values: string[];
  displayText: string[];
}
