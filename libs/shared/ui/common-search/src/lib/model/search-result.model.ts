export interface AbstractData {
  [key: string]: unknown;
}

export interface CommonSearchSelection {
  data: AbstractData[];
  values: string[];
  displayText: string[];
}
