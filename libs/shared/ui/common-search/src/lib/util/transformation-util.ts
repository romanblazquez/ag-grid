import { Context } from '../model/context.model';
import { AbstractData } from '../model/solr-response.model';
import { Item, TreeNode } from '../model/tree-result.model';
import { Broker } from '../model/broker-dealer-response.interface';

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
  finalResults: any[],
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
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
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
    const parentName = broker.parentFirmLongName || '';
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
        visible: false, // Hidden field for emit purposes
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

    return { items: items, header: false, sourceData: dealer };
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

  // Create header items for child nodes
  const headerItems: Item[] = serviceContext.detailHeaders.map((header, i) => {
    return {
      name: serviceContext.detailFields.filter((d) => d.visible)[i].name,
      value: header,
      visible: true,
    };
  });

  // Transform each group into a TreeNode
  for (const [parentName, dealers] of groupMap.entries()) {
    // Create parent node items
    const parentItems: Array<Item> = [];

    // Add parent firm name item using treeAttributes
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

  // Use reduce to create the key/value map
  const mergedMap: { [key: string]: string } = keys.reduce(
    (map, key, index) => {
      // eslint-disable-next-line
      // @ts-ignore
      map[key] = values[index];
      return map;
    },
    {},
  );

  return mergedMap;
}

//CODE FOR CREATING TREE DATA UP TO 2 LEVELS - NOT NEEDED YET

/* export function transformToTreeNodes(
  searchResults: Array<AbstractData>,
  serviceContext: Context
): TreeNode[] {
  const treeAttributes: Record<number, string[]> =
    serviceContext.treeAttributes as Record<number, string[]>;
  const treeLevels = Object.keys(treeAttributes).length;
  const groupedData = groupByTree(searchResults, treeLevels, treeAttributes);

  const finalResults: TreeNode[] = [];

  switch (treeLevels) {
    case 1:
      transformOneLevelTree(
        groupedData,
        serviceContext,
        treeAttributes,
        finalResults
      );
      break;
    case 2:
      transformTwoLevelTree(
        groupedData,
        serviceContext,
        treeAttributes,
        finalResults
      );

      break;
  }
  return finalResults;
}
 */

/* function transformOneLevelTree(
  groupedData: Array<AbstractData>,
  serviceContext: Context,
  treeAttributes: Record<number, string[]>,
  finalResults: any[]
): void {
  groupedData.forEach((group) => {
    const childNodes: TreeNode[] = (group as Array<any>).map((row) => {
      const items: Array<Item> = [];
      serviceContext.detailFields.forEach((field) => {
        const item: Item = {
          name: field,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          value: row[field],
        };
        items.push(item);
      });

      return { items: items };
    });
    const parentItems: Array<Item> = [];

    treeAttributes[0].forEach((field) => {
      const item: Item = {
        name: field,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        value: group[0][field],
      };
      parentItems.push(item);
    });

    const parentNode: TreeNode = {
      items: parentItems,
      children: childNodes,
    };
    finalResults.push(parentNode);
  });
}

function transformTwoLevelTree(
  groupedData: Array<AbstractData>,
  serviceContext: Context,
  treeAttributes: Record<number, string[]>,
  finalResults: any[]
): void {
  groupedData.forEach((secondGroupedData) => {
    const secondParentNode: TreeNode[] = [];
    (secondGroupedData as AbstractData[]).forEach((group) => {
      const childNodes: TreeNode[] = (group as Array<any>).map((row) => {
        const items: Array<Item> = [];
        serviceContext.detailFields.forEach((field) => {
          const item: Item = {
            name: field,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            value: row[field],
          };
          items.push(item);
        });

        return { items: items };
      });
      const secondParentItems: Array<Item> = [];

      treeAttributes[1].forEach((field) => {
        const item: Item = {
          name: field,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          value: group[0][field],
        };
        secondParentItems.push(item);
      });

      secondParentNode.push({
        items: secondParentItems,
        children: childNodes,
      });
    });

    const parentItems: Array<Item> = [];

    treeAttributes[0].forEach((field) => {
      const item: Item = {
        name: field,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        value: secondGroupedData[0][field],
      };
      parentItems.push(item);
    });

    const parentNode: TreeNode = {
      items: parentItems,
      children: secondParentNode,
    };
    finalResults.push(parentNode);
  });
} */

/* export function groupByTree(
  data: Array<AbstractData>,
  treeLevels: number,
  treeAttributes: Record<number, string[]>
): Array<AbstractData> {
  let groupedData: AbstractData[] = [];
  for (let i = 0; i < treeLevels; i++) {
    if (i === 0) {
      groupedData = groupBy(data, treeAttributes[i][0]);
    } else {
      groupedData = groupedData.map((alreadyGrouped) =>
        groupBy(alreadyGrouped as AbstractData[], treeAttributes[i][0])
      );
    }
  }
  if(treeLevels !== 0){
  groupedData = groupedData.flat(treeLevels-1);
  }
  return groupedData;
}

export function groupBy(
  data: Array<AbstractData>,
  property: string
): AbstractData[] {
  let val: string;
  let index;
  const values = [];
  const result = [];
  for (const row of data) {
    val = row[property] as string;
    index = values.indexOf(val);
    if (index > -1) {
      result[index].push(row);
    } else {
      values.push(val);
      result.push([row]);
    }
  }
  return result;
} */
