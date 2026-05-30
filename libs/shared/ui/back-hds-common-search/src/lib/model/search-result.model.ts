export interface AbstractData {
  [key: string]: unknown;
}

export type CommonSearchValue = string | number;

export interface CommonSearchSelection {
  data: AbstractData[];
  values: CommonSearchValue[];
  displayText: string[];
}
