import { AbstractData } from '../model/search-result.model';
import { TreeNode } from '../model/tree-node.model';
import { SearchType } from '../model/search-type.enum';

export const MOCK_SYMBOLS: AbstractData[] = [
  { symbol: 'AAPL', cusip: '037833100', description: 'Apple Inc.' },
  { symbol: 'MSFT', cusip: '594918104', description: 'Microsoft Corporation' },
  { symbol: 'GOOGL', cusip: '02079K305', description: 'Alphabet Inc. Class A' },
  { symbol: 'AMZN', cusip: '023135106', description: 'Amazon.com Inc.' },
  { symbol: 'TSLA', cusip: '88160R101', description: 'Tesla Inc.' },
  { symbol: 'NVDA', cusip: '67066G104', description: 'NVIDIA Corporation' },
  { symbol: 'META', cusip: '30303M102', description: 'Meta Platforms Inc.' },
  { symbol: 'BRK.B', cusip: '084670702', description: 'Berkshire Hathaway B' },
  { symbol: 'JPM', cusip: '46625H100', description: 'JPMorgan Chase & Co.' },
  { symbol: 'V', cusip: '92826C839', description: 'Visa Inc.' },
  { symbol: 'JNJ', cusip: '478160104', description: 'Johnson & Johnson' },
  { symbol: 'WMT', cusip: '931142103', description: 'Walmart Inc.' },
  { symbol: 'PG', cusip: '742718109', description: 'Procter & Gamble Co.' },
  { symbol: 'MA', cusip: '57636Q104', description: 'Mastercard Inc.' },
  { symbol: 'UNH', cusip: '91324P102', description: 'UnitedHealth Group Inc.' },
  { symbol: 'HD', cusip: '437076102', description: 'Home Depot Inc.' },
  { symbol: 'DIS', cusip: '254687106', description: 'The Walt Disney Company' },
  { symbol: 'BAC', cusip: '060505104', description: 'Bank of America Corp.' },
  { symbol: 'XOM', cusip: '30231G102', description: 'Exxon Mobil Corporation' },
  { symbol: 'PFE', cusip: '717081103', description: 'Pfizer Inc.' },
];

export const MOCK_FUNDS: AbstractData[] = [
  { shortName: 'FCNTX', fundNumber: '00022', fullName: 'Fidelity Contrafund' },
  { shortName: 'FXAIX', fundNumber: '00650', fullName: 'Fidelity 500 Index Fund' },
  { shortName: 'FBGRX', fundNumber: '00006', fullName: 'Fidelity Blue Chip Growth Fund' },
  { shortName: 'FMAGX', fundNumber: '00021', fullName: 'Fidelity Magellan Fund' },
  { shortName: 'FLPSX', fundNumber: '00316', fullName: 'Fidelity Low-Priced Stock Fund' },
  { shortName: 'FOCPX', fundNumber: '00093', fullName: 'Fidelity OTC Portfolio' },
  { shortName: 'FBALX', fundNumber: '00304', fullName: 'Fidelity Balanced Fund' },
  { shortName: 'FDGRX', fundNumber: '00025', fullName: 'Fidelity Growth Company Fund' },
  { shortName: 'FSPGX', fundNumber: '01867', fullName: 'Fidelity Large Cap Growth Index Fund' },
  { shortName: 'FDSSX', fundNumber: '00328', fullName: 'Fidelity Stock Selector Mid Cap' },
  { shortName: 'FGRIX', fundNumber: '00027', fullName: 'Fidelity Growth & Income Portfolio' },
  { shortName: 'FSMEX', fundNumber: '00505', fullName: 'Fidelity Select Medical Tech' },
  { shortName: 'FDLSX', fundNumber: '00069', fullName: 'Fidelity Select Leisure Portfolio' },
];

export const MOCK_BROKERS: AbstractData[] = [
  { firmSourceId: 1001, firmName: 'Goldman Sachs & Co. LLC', firmCode: 'GS' },
  { firmSourceId: 1002, firmName: 'Morgan Stanley', firmCode: 'MS' },
  { firmSourceId: 1003, firmName: 'J.P. Morgan Securities LLC', firmCode: 'JPM' },
  { firmSourceId: 1004, firmName: 'Citigroup Global Markets Inc.', firmCode: 'C' },
  { firmSourceId: 1005, firmName: 'BofA Securities, Inc.', firmCode: 'BAC' },
  { firmSourceId: 1006, firmName: 'Barclays Capital Inc.', firmCode: 'BCS' },
  { firmSourceId: 1007, firmName: 'Credit Suisse Securities (USA) LLC', firmCode: 'CS' },
  { firmSourceId: 1008, firmName: 'UBS Securities LLC', firmCode: 'UBS' },
  { firmSourceId: 1009, firmName: 'Deutsche Bank Securities Inc.', firmCode: 'DB' },
  { firmSourceId: 1010, firmName: 'Wells Fargo Securities, LLC', firmCode: 'WFC' },
  { firmSourceId: 1011, firmName: 'Jefferies LLC', firmCode: 'JEF' },
  { firmSourceId: 1012, firmName: 'Cowen and Company LLC', firmCode: 'COWN' },
];

export const MOCK_TRADERS: AbstractData[] = [
  { personSourceId: 'P001', fullName: 'Alice Anderson', desk: 'FMREQ' },
  { personSourceId: 'P002', fullName: 'Brian Brooks', desk: 'FMREQ' },
  { personSourceId: 'P003', fullName: 'Carla Chen', desk: 'FMRHI' },
  { personSourceId: 'P004', fullName: 'David Diaz', desk: 'FMRCY' },
  { personSourceId: 'P005', fullName: 'Emma Evans', desk: 'FMRHI' },
  { personSourceId: 'P006', fullName: 'Felipe Ferreira', desk: 'FMRCY' },
  { personSourceId: 'P007', fullName: 'Gloria Garcia', desk: 'FMREQ' },
  { personSourceId: 'P008', fullName: 'Hiroshi Honda', desk: 'FMREQ' },
  { personSourceId: 'P009', fullName: 'Isabella Ibarra', desk: 'FMRHI' },
  { personSourceId: 'P010', fullName: 'Jamal Johnson', desk: 'FMRCY' },
];

export const MOCK_INSTRUMENT_TREE: TreeNode[] = [
  {
    items: [
      { name: 'description', value: 'Equity' },
      { name: 'code', value: 'EQ' },
    ],
    children: [
      {
        items: [
          { name: 'description', value: 'Common Stock' },
          { name: 'code', value: 'CS' },
        ],
      },
      {
        items: [
          { name: 'description', value: 'Preferred Stock' },
          { name: 'code', value: 'PS' },
        ],
      },
      {
        items: [
          { name: 'description', value: 'ADR / GDR' },
          { name: 'code', value: 'AD' },
        ],
      },
      {
        items: [
          { name: 'description', value: 'REIT' },
          { name: 'code', value: 'RT' },
        ],
      },
    ],
  },
  {
    items: [
      { name: 'description', value: 'Fixed Income' },
      { name: 'code', value: 'FI' },
    ],
    children: [
      {
        items: [
          { name: 'description', value: 'Corporate Bond' },
          { name: 'code', value: 'CB' },
        ],
      },
      {
        items: [
          { name: 'description', value: 'Government Bond' },
          { name: 'code', value: 'GB' },
        ],
      },
      {
        items: [
          { name: 'description', value: 'Municipal Bond' },
          { name: 'code', value: 'MB' },
        ],
      },
    ],
  },
  {
    items: [
      { name: 'description', value: 'Derivatives' },
      { name: 'code', value: 'DR' },
    ],
    children: [
      {
        items: [
          { name: 'description', value: 'Equity Option' },
          { name: 'code', value: 'EO' },
        ],
      },
      {
        items: [
          { name: 'description', value: 'Index Future' },
          { name: 'code', value: 'IF' },
        ],
      },
      {
        items: [
          { name: 'description', value: 'Interest Rate Swap' },
          { name: 'code', value: 'IS' },
        ],
      },
    ],
  },
  {
    items: [
      { name: 'description', value: 'Crypto / Digital Assets' },
      { name: 'code', value: 'CY' },
    ],
    children: [
      {
        items: [
          { name: 'description', value: 'Spot Crypto' },
          { name: 'code', value: 'CS-SPOT' },
        ],
      },
      {
        items: [
          { name: 'description', value: 'Crypto Future' },
          { name: 'code', value: 'CF' },
        ],
      },
    ],
  },
];

export function suggestionsFor(type: SearchType): AbstractData[] {
  switch (type) {
    case SearchType.Symbol:
      return MOCK_SYMBOLS;
    case SearchType.FundPm:
      return MOCK_FUNDS;
    case SearchType.Broker:
      return MOCK_BROKERS;
    case SearchType.Trader:
      return MOCK_TRADERS;
    default:
      return [];
  }
}
