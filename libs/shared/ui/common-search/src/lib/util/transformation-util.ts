import { Context } from '../model/search-context.model';
import { AbstractData } from '../model/search-result.model';
import { Item, TreeNode } from '../model/tree-node.model';

export interface Broker {
  id: string;
  idSrc: string;
  firmNumber: number;
  shortName: string;
  longName: string;
  parentFirmLongName?: string;
  tradeBrokerIndicator?: string;
  statusCode?: string;
}

export function transformSolrGroupedToTreeNodes(
  searchResults: Array<AbstractData>,
  serviceContext: Context,
): TreeNode[] {
  const treeAttributes: Record<number, string[]> =
    serviceContext.treeAttributes as Record<number, string[]>;
  const treeLevels = Object.keys(treeAttributes).length;

  const finalResults: TreeNode[] = [];

  switch (treeLevels) {
    case 1:
      transformSolrOneLevelGroup(
        searchResults,
        serviceContext,
        treeAttributes,
        finalResults,
      );
      break;
  }
  return finalResults;
}

function transformSolrOneLevelGroup(
  groupedData: Array<AbstractData>,
  serviceContext: Context,
  treeAttributes: Record<number, string[]>,
  finalResults: TreeNode[],
): void {
  groupedData.forEach((group) => {
    const detailFields = (group['doclist'] as AbstractData)[
      'docs'
    ] as AbstractData[];
    const headerItems: Item[] = serviceContext.detailHeaders.map(
      (header, i) => {
        return {
          name: serviceContext.detailFields.filter((d) => d.visible)[i].name,
          value: header,
          visible: true,
        };
      },
    );
    const childHeader: TreeNode[] = [
      {
        header: true,
        items: headerItems,
      },
    ];
    const childNodes: TreeNode[] = detailFields.map((row) => {
      const items: Array<Item> = [];
      serviceContext.detailFields.forEach((field) => {
        const item: Item = {
          name: field.name,
          value: row[field.name],
          visible: field.visible,
        };
        items.push(item);
      });

      return { items: items, header: false };
    });
    const parentItems: Array<Item> = [];

    treeAttributes[0].forEach((field) => {
      const item: Item = {
        name: field,
        value: group['groupValue'],
        visible: true,
      };
      parentItems.push(item);
    });

    const parentNode: TreeNode = {
      items: parentItems,
      children: childHeader.concat(childNodes),
      header: false,
    };
    finalResults.push(parentNode);
  });
}

function groupBrokersByParentFirm(brokers: Broker[]): Map<string, Broker[]> {
  const groupMap = new Map<string, Broker[]>();

  brokers.forEach((broker) => {
    const parentName = broker.parentFirmLongName ?? '';
    if (!groupMap.has(parentName)) {
      groupMap.set(parentName, []);
    }
    groupMap.get(parentName)!.push(broker);
  });

  return groupMap;
}

function createBrokerChildNodes(
  dealers: Broker[],
  serviceContext: Context,
): TreeNode[] {
  return dealers.map((dealer) => {
    const items: Array<Item> = [];
    const dealerRecord = dealer as unknown as Record<string, unknown>;

    const detailFieldNames = serviceContext.detailFields.map((f) => f.name);
    if (!detailFieldNames.includes(serviceContext.emitField)) {
      items.push({
        name: serviceContext.emitField,
        value: dealerRecord[serviceContext.emitField],
        visible: false,
      });
    }

    serviceContext.detailFields.forEach((field) => {
      const item: Item = {
        name: field.name,
        value: dealerRecord[field.name],
        visible: field.visible,
      };
      items.push(item);
    });

    return { items: items, header: false };
  });
}

export function transformBrokersToTreeNodes(
  brokers: Broker[],
  serviceContext: Context,
): TreeNode[] {
  const groupMap = groupBrokersByParentFirm(brokers);
  const results: TreeNode[] = [];
  const treeAttributes: Record<number, string[]> =
    serviceContext.treeAttributes as Record<number, string[]>;

  const headerItems: Item[] = serviceContext.detailHeaders.map((header, i) => {
    return {
      name: serviceContext.detailFields.filter((d) => d.visible)[i].name,
      value: header,
      visible: true,
    };
  });

  for (const [parentName, dealers] of groupMap.entries()) {
    const parentItems: Array<Item> = [];

    treeAttributes[0].forEach((field) => {
      const item: Item = {
        name: field,
        value: parentName,
        visible: true,
      };
      parentItems.push(item);
    });

    const childHeader: TreeNode[] = [
      {
        header: true,
        items: headerItems,
      },
    ];

    const childNodes: TreeNode[] = createBrokerChildNodes(
      dealers,
      serviceContext,
    );

    const parentNode: TreeNode = {
      items: parentItems,
      children: childHeader.concat(childNodes),
      header: false,
    };

    results.push(parentNode);
  }

  return results;
}

export function mergeArraysToMap(
  keys: string[],
  values: string[],
): { [key: string]: string } {
  if (keys.length !== values.length) {
    throw new Error('The number of keys and values must be the same.');
  }

  const mergedMap: { [key: string]: string } = keys.reduce(
    (map, key, index) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (map as Record<string, string>)[key] = values[index];
      return map;
    },
    {} as { [key: string]: string },
  );

  return mergedMap;
}
