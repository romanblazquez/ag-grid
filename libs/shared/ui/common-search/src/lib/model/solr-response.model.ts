export interface SolrResponse {
  response?: {
    docs: Array<AbstractData>;
  };
  grouped?: AbstractData;
}

export interface AbstractData {
  [key: string]: any;
}
