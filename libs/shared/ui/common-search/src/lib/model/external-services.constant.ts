/* eslint-disable */
import { of } from 'rxjs';
import { Context } from './context.model';
import { SearchType } from './search-type.model';
import { ApiName, ServiceConfig } from './service-config.model';
import { NodeName, PreferenceKey } from './preference-context.model';

export const externalServices: Record<SearchType, Context> = {
  FundPm: {
    apiNames: [ApiName.GetPortfolio],
    initLoadData: false,
    detailFields: [
      { name: 'shortName', visible: true },
      { name: 'fundNumber', visible: true },
      { name: 'longName', visible: true },
    ],
    emitField: 'fundNumber',
    isTreeView: false,
    fieldWidths: {
      shortName: 20,
      fundNumber: 20,
      longName: 60,
    },
    detailHeaders: ['Fund', 'Fund #', 'Fund Long Name'],
    panelWidth: 462,
    inputWidth: '212px',
    placeholder: 'Fund/PM Name',
    errorMessage: 'Invalid Fund',
    chipContext: {
      name: 'Fund',
      pluralName: 'Funds',
      items: [],
    },
    preferenceContext: {
      nodeName: NodeName.Portfolio,
      key: PreferenceKey.Portfolio,
      limit: 5,
    },
  },
  Symbol: {
    apiNames: [ApiName.GetSecurities],
    initLoadData: false,
    detailFields: [
      { name: 'ticker', visible: true },
      { name: 'issueCUSIP', visible: false },
      { name: 'bloombergId2', visible: true },
      { name: 'longName', visible: true },
    ],
    emitField: 'issueCUSIP',
    multiselect: true,
    isTreeView: false,
    fieldWidths: {
      ticker: 20,
      bloombergId2: 25,
      longName: 55,
    },
    panelWidth: 550,
    detailHeaders: ['Symbol', 'BBG Ticker', 'Security Name'],

    inputWidth: '212px',
    placeholder: 'Symbol',
    errorMessage: 'Invalid Symbol',
    chipContext: {
      name: 'Symbol',
      pluralName: 'Symbols',
      items: [],
    },
    preferenceContext: {
      nodeName: NodeName.Symbol,
      key: PreferenceKey.Symbol,
      limit: 5,
    },
  },
  Broker: {
    apiNames: [ApiName.GetBrokers],
    initLoadData: true,
    detailFields: [
      { name: 'shortName', visible: true },
      { name: 'longName', visible: true },
    ],
    detailHeaders: ['Broker', 'Broker Long Name'],
    emitField: 'idSrc',
    isTreeView: true,
    treeAttributes: {
      '0': ['parentFirmLongName'],
    },
    fieldWidths: {
      parentFirmLongName: 40,
      shortName: 30,
      longName: 70,
    },
    panelWidth: 462,
    inputWidth: '212px',
    multiselect: true,
    placeholder: 'Broker',
    errorMessage: 'Invalid Broker',
    chipContext: {
      name: 'Broker',
      pluralName: 'Brokers',
      items: [],
    },
    preferenceContext: {
      nodeName: NodeName.Broker,
      key: PreferenceKey.Broker,
      limit: 5,
    },
  },
  ParentBroker: {
    apiNames: [ApiName.GetParentBrokers],
    initLoadData: true,
    detailFields: [
      { name: 'shortName', visible: true },
      { name: 'longName', visible: true },
    ],
    detailHeaders: ['Broker', 'Broker Long Name'],
    emitField: 'cashDesk',
    isTreeView: false,
    fieldWidths: {
      shortName: 30,
      longName: 70,
    },
    panelWidth: 462,
    inputWidth: '212px',
    multiselect: false,
    placeholder: 'Broker',
    errorMessage: 'Invalid Broker',
    preferenceContext: {
      nodeName: NodeName.ParentBroker,
      key: PreferenceKey.ParentBroker,
      limit: 5,
    },
  },
  InstrumentType: {
    apiNames: [ApiName.GetIVTypes],
    initLoadData: true,
    showAll: true,
    detailFields: [
      { name: 'code', visible: true },
      { name: 'description', visible: true },
    ],
    detailHeaders: ['Code', 'Instrument Type Name'],
    emitField: 'code',
    isTreeView: true,
    fieldWidths: {
      code: 30,
      description: 70,
    },
    panelWidth: 462,
    inputWidth: '212px',
    multiselect: true,
    placeholder: 'Instrument Type',
    errorMessage: 'Invalid Instrument',
    chipContext: {
      name: 'IVType',
      pluralName: 'IVTypes',
      items: [],
    },
  },
  Trader: {
    apiNames: [ApiName.GetTraders],
    initLoadData: true,
    showAll: true,
    detailFields: [
      { name: 'initials', visible: true },
      { name: 'reportingName', visible: true },
    ],
    detailHeaders: ['Trader Initials', 'Trader Name'],
    emitField: 'personId',
    isTreeView: false,
    fieldWidths: {
      initials: 30,
      reportingName: 70,
    },
    panelWidth: 500,
    inputWidth: '212px',
    multiselect: true,
    placeholder: 'Trader',
    errorMessage: 'Invalid Trader',
    preferenceContext: {
      nodeName: NodeName.Trader,
      key: PreferenceKey.Trader,
      limit: 5,
    },
    chipContext: {
      name: 'Trader',
      pluralName: 'Traders',
      items: [],
    },
  },
  PmAndTraders: {
    apiNames: [ApiName.GetTraders, ApiName.GetPMs],
    initLoadData: true,
    showAll: true,
    detailFields: [
      { name: 'initials', visible: true },
      { name: 'reportingName', visible: true },
    ],
    detailHeaders: ['Initials', 'Name'],
    emitField: 'personId',
    isTreeView: false,
    fieldWidths: {
      initials: 30,
      reportingName: 70,
    },
    panelWidth: 500,
    inputWidth: '212px',
    multiselect: true,
    placeholder: 'Created By',
    errorMessage: 'Invalid Person',
    preferenceContext: {
      nodeName: NodeName.PmAndTraders,
      key: PreferenceKey.PmAndTraders,
      limit: 5,
    },
    chipContext: {
      name: 'Created By',
      pluralName: 'Created By',
      items: [],
    },
  },

  Team: {
    apiNames: [ApiName.GetTeams],
    initLoadData: true,
    showAll: true,
    detailFields: [
      { name: 'shortName', visible: true },
      { name: 'longName', visible: true },
    ],
    detailHeaders: ['Team Initials', 'Team Name'],
    emitField: 'shortName',
    isTreeView: false,
    fieldWidths: {
      initials: 30,
      reportingName: 70,
    },
    panelWidth: 500,
    inputWidth: '212px',
    multiselect: false,
    placeholder: 'Team',
    errorMessage: 'Invalid Team',
    preferenceContext: {
      nodeName: NodeName.Team,
      key: PreferenceKey.Team,
      limit: 5,
    },
    chipContext: {
      name: 'Team',
      pluralName: 'Teams',
      items: [],
    },
  },
  TraderTeam: {
    // No apiName - this service combines data internally from PersonService
    initLoadData: true,
    showAll: true,
    detailFields: [
      { name: 'displayName', visible: true },
      { name: 'fullName', visible: true },
    ],
    detailHeaders: ['Initials', 'Name', 'Type'],
    emitField: 'id',
    isTreeView: false,
    fieldWidths: {
      displayName: 30,
      fullName: 60,
    },
    panelWidth: 330,
    inputWidth: '212px',
    multiselect: false,
    placeholder: 'Trader / Team',
    errorMessage: 'Invalid Trader / Team',
    // Remove preferenceContext to disable preference system integration
    chipContext: {
      name: 'TraderTeam',
      pluralName: 'TraderTeams',
      items: [],
    },
  },
  StructureType: {
    apiNames: [ApiName.GetStructureTypes],
    initLoadData: true,
    showAll: true,
    detailFields: [
      { name: 'code', visible: true },
      { name: 'description', visible: true },
    ],
    detailHeaders: ['Code', 'Structure Type Name'],
    emitField: 'code',
    isTreeView: true,
    fieldWidths: {
      code: 30,
      description: 70,
    },
    panelWidth: 462,
    inputWidth: '212px',
    multiselect: true,
    placeholder: 'Structure Type',
    errorMessage: 'Invalid Structure Type',
    chipContext: {
      name: 'StructureType',
      pluralName: 'StructureTypes',
      items: [],
    },
  },
};

const MOCK_API = 'http://localhost:3000/api';

export const svcConfig: Record<ApiName, ServiceConfig> = {
  GetBrokers: {
    url: of(`${MOCK_API}/brokers`),
    method: 'get',
  },
  getParentBrokers: {
    url: of(`${MOCK_API}/brokers`),
    method: 'get',
  },
  GetPortfolio: {
    url: of(`${MOCK_API}/portfolio?q={query}`),
    method: 'get',
  },
  GetIVTypes: {
    url: of(`${MOCK_API}/codevalues`),
    method: 'get',
  },
  GetSecurities: {
    url: of(`${MOCK_API}/securities?q={query}`),
    method: 'get',
  },
  GetEqtActiveSecurities: {
    url: of(`${MOCK_API}/securities?q={query}`),
    method: 'get',
  },
  GetTraders: {
    url: of(`${MOCK_API}/persons/traders`),
    method: 'get',
  },
  GetPMs: {
    url: of(`${MOCK_API}/persons/traders`),
    method: 'get',
  },
  GetTeams: {
    url: of(`${MOCK_API}/persons/traders`),
    method: 'get',
  },
  GetStructureTypes: {
    url: of(`${MOCK_API}/codevalues`),
    method: 'get',
  },
};

export const moduleName = 'Common Multi-Select';
