export interface PreferenceContext {
  nodeName: NodeName;
  key: PreferenceKey;
  limit: number;
}

export enum NodeName {
  Broker = 'Broker',
  ParentBroker = 'ParentBroker',
  Instrument = 'Instrument',
  Portfolio = 'Portfolio',
  Symbol = 'Symbol',
  Trader = 'Trader',
  PmAndTraders = 'PmAndTraders',
  Team = 'Team',
  TraderTeam = 'TraderTeam',
}

export enum PreferenceKey {
  Broker = 'listBrokers',
  ParentBroker = 'listParentBrokers',
  Instrument = 'listInstrument',
  Portfolio = 'listPortfolios',
  Symbol = 'listSymbol',
  Trader = 'listTraders',
  PmAndTraders = 'listPmAndTraders',
  Team = 'listTeams',
  TraderTeam = 'listTraderTeams',
}
