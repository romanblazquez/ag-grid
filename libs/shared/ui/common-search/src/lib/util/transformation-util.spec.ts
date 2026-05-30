import { externalServices } from '../model/external-services.constant';
import { AbstractData } from '../model/solr-response.model';
import {
  transformSolrGroupedToTreeNodes,
  transformBrokersToTreeNodes,
} from './transformation-util';

describe('transformSolrGroupedToTreeNodes', () => {
  it('should convert solr grouped response to treenode, one level group', () => {
    const data = [
      {
        groupValue: 'William  Danoff',
        doclist: {
          numFound: 3,
          start: 0,
          numFoundExact: true,
          docs: [
            {
              fundNumber: '22',
              shortName: 'CONT',
              longName: 'CONTRAFUND',
            },
            {
              fundNumber: '16850',
              shortName: 'CONTCP',
              longName: 'FID CONTR COMM POOL T16850',
            },
            {
              fundNumber: '2946',
              shortName: 'CONTK',
              longName: 'FIDELITY CONTRAFUND K6',
            },
          ],
        },
      },
      {
        groupValue: 'Jason L Weiner',
        doclist: {
          numFound: 1,
          start: 0,
          numFoundExact: true,
          docs: [
            {
              fundNumber: '339',
              shortName: 'CONT2',
              longName: 'FIDELITY GROWTH DISCOVERY FUND',
            },
          ],
        },
      },
    ];

    const result = transformSolrGroupedToTreeNodes(
      data as AbstractData[],
      externalServices.FundPm,
    );

    result.forEach((treeNode) => {
      expect(treeNode.items.length).toEqual(1);
      expect(treeNode.items[0].name).toEqual('pmFullName_group');
    });
  });
});

describe('transformBrokersToTreeNodes', () => {
  it('should transform brokers to tree nodes structure', () => {
    const brokers = [
      {
        id: '1',
        idSrc: '100',
        firmNumber: 100,
        shortName: 'BROKER1',
        longName: 'Broker One Limited',
        tradeBrokerIndicator: 'Y',
        statusCode: 'A',
        isoCtryCd: 'US',
        isoOffInd: 'N',
        countryCd: 'US',
        countryName: 'United States',
        taxWithheldRt: '0',
        firmAddDateTime: '2023-01-01T00:00:00.000',
        firmUpdateDateTime: '2023-01-01T00:00:00.000',
        affiliatedIndicator: 'N',
        parentFirmLongName: 'Parent Broker One',
      },
      {
        id: '2',
        idSrc: '200',
        firmNumber: 200,
        shortName: 'BROKER2',
        longName: 'Broker Two Corporation',
        tradeBrokerIndicator: 'Y',
        statusCode: 'A',
        isoCtryCd: 'UK',
        isoOffInd: 'N',
        countryCd: 'UK',
        countryName: 'United Kingdom',
        taxWithheldRt: '0',
        firmAddDateTime: '2023-01-01T00:00:00.000',
        firmUpdateDateTime: '2023-01-01T00:00:00.000',
        affiliatedIndicator: 'N',
        parentFirmLongName: 'Parent Broker Two',
      },
    ];

    const context = {
      placeholder: 'Search Broker',
      initLoadData: true,
      detailHeaders: ['Short Name', 'Long Name'],
      detailFields: [
        { name: 'shortName', visible: true },
        { name: 'longName', visible: true },
      ],
      fieldWidths: {},
      emitField: 'firmNumber',
      errorMessage: 'No brokers found',
      panelWidth: 500,
      multiselect: true,
      isTreeView: true,
      treeAttributes: {
        0: ['parentFirmLongName'],
      },
    };

    const result = transformBrokersToTreeNodes(brokers, context);

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should handle empty broker list', () => {
    const context = {
      placeholder: 'Search Broker',
      initLoadData: true,
      detailHeaders: ['Short Name', 'Long Name'],
      detailFields: [
        { name: 'shortName', visible: true },
        { name: 'longName', visible: true },
      ],
      fieldWidths: {},
      emitField: 'firmNumber',
      errorMessage: 'No brokers found',
      panelWidth: 500,
      multiselect: true,
      isTreeView: true,
      treeAttributes: {
        0: ['parentFirmLongName'],
      },
    };

    const result = transformBrokersToTreeNodes([], context);

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });
});
