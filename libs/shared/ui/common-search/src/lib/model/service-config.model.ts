import { Observable } from 'rxjs';

export interface ServiceConfig {
  url: Observable<string>;
  method: string;
}

export enum ApiName {
  GetPortfolio = 'GetPortfolio',
  GetBrokers = 'GetBrokers',
  GetParentBrokers = 'getParentBrokers',
  GetIVTypes = 'GetIVTypes',
  GetSecurities = 'GetSecurities',
  GetEqtActiveSecurities = 'GetEqtActiveSecurities',
  GetTraders = 'GetTraders',
  GetPMs = 'GetPMs',
  GetTeams = 'GetTeams',
  GetStructureTypes = 'GetStructureTypes',
}
