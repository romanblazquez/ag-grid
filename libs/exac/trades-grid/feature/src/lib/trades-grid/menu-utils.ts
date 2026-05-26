import {
  HarmonixService,
  HarmonixContext,
  TradeContext,
  TradeListContext,
  EntityType,
} from '@trade-platform/shared/data-access';
import { IMenuActionParams } from 'ag-grid-community';
import { ExecutionModel, TradeModel } from '@trade-platform/exac/shared/data';
import {
  MENU_LABEL_CANCEL_BLOCK_EXECUTIONS,
  MENU_LABEL_CANCEL_TRADES,
  MENU_LABEL_CANCEL_TRADE,
  MENU_LABEL_UPDATE_TRADER_NOTE,
  MENU_LABEL_UPDATE_TRADER_NOTES,
  WARN_UPDATE_NOTE_DIALOG_NOT_CONFIGURED,
} from './constants/default-menu.constants';

export function isTradeCancelled(trade: TradeModel | ExecutionModel): boolean {
  const status =
    'tradeStatus' in trade
      ? trade.tradeStatus
      : 'executionStatusCode' in trade
        ? trade.executionStatusCode
        : '';
  return status === 'XC' || status === 'XA';
}

export interface EventData {
  data: TradeModel | ExecutionModel;
  entityId?: string;
  executionId?: string;
}

export interface ClickNode {
  isSelected: () => boolean;
  setSelected: (selected: boolean, clearSelection?: boolean) => void;
  group?: boolean;
  allLeafChildren?: ClickNode[];
  childrenAfterFilter?: ClickNode[];
  data?: unknown;
  [key: string]: any;
}

function toHarmonixContext(context: TradeContext | TradeListContext): HarmonixContext {
  return { ...context };
}

export function createTradeContext(eventData: EventData): TradeContext {
  let entityId = eventData.entityId;
  let entityType: EntityType = EntityType.TRADE;
  if (!entityId && eventData.data) {
    if ('entityId' in eventData.data) {
      entityId = (eventData.data as TradeModel).entityId;
      entityType = EntityType.TRADE;
    } else if ('executionId' in eventData.data) {
      entityId = (eventData.data as ExecutionModel).executionId;
      entityType = EntityType.EXECUTION;
    }
  } else if (eventData.executionId) {
    entityId = eventData.executionId;
    entityType = EntityType.EXECUTION;
  }

  return {
    type: 'fdc3.trade',
    id: {
      entityId: entityId as string,
      entityType,
    },
    product: {
      id: { entityId: entityId as string },
      type: 'fdc3.product',
    },
  };
}

export function createTradeListContext(selectedData: EventData[]): TradeListContext {
  const trades = selectedData.map((eventData: EventData) => {
    const entityId = eventData.entityId || eventData.executionId;
    const entityType: EntityType = eventData.executionId
      ? EntityType.EXECUTION
      : EntityType.TRADE;

    return {
      type: 'fdc3.trade' as const,
      id: {
        entityId: entityId as string,
        entityType,
      },
    } as TradeContext;
  });

  return {
    type: 'fdc3.tradeList',
    trades,
  };
}

export function handleContextMenuSelection(clickedNode: ClickNode): void {
  const isClickedRowSelected = clickedNode.isSelected();
  if (isClickedRowSelected) return;

  if (clickedNode.group) {
    const allChildren = (clickedNode.allLeafChildren || []) as Array<{
      isSelected: () => boolean;
      setSelected: (selected: boolean, clearSelection?: boolean) => void;
    }>;
    const selectedChildren = allChildren.filter((child) => child.isSelected());
    const isPartiallySelected =
      selectedChildren.length > 0 && selectedChildren.length < allChildren.length;
    const isNotSelected = selectedChildren.length === 0;

    if (isNotSelected || isPartiallySelected) {
      allChildren.forEach((child) => child.setSelected(true, false));
      clickedNode.setSelected(true, false);
    }
  } else {
    clickedNode.setSelected(true, false);
  }
}

export function getAdditionalMenuItems(
  harmonixService: HarmonixService,
  contextItem: (event: any) => TradeContext,
  selectedNodes?: number,
  openCancelDialog?: () => void,
  selectedType: 'trade' | 'execution' = 'trade',
  openUpdateNoteDialog?: () => void,
): any[] {
  const menuLabel =
    selectedType === 'execution'
      ? MENU_LABEL_CANCEL_BLOCK_EXECUTIONS
      : (selectedNodes ?? 0) > 1
        ? MENU_LABEL_CANCEL_TRADES
        : MENU_LABEL_CANCEL_TRADE;

  const menuItems = [
    {
      name: menuLabel,
      action: async (params: IMenuActionParams<any, any>) => {
        if (!params.api || typeof params.api.getSelectedNodes !== 'function') {
          return;
        }
        const selectedNodes = params.api.getSelectedNodes();
        const hasCancelled = selectedNodes.some(
          (node) =>
            node.data && isTradeCancelled(node.data as TradeModel | ExecutionModel),
        );
        if (hasCancelled) {
          console.warn(
            'Cannot Cancel: One or more selected trades are already cancelled (XC/XA).',
          );
          return;
        }
        if (selectedNodes.length > 1) {
          if (openCancelDialog) {
            openCancelDialog();
          } else {
            const selectedData: EventData[] = selectedNodes
              .filter((node) => node.data)
              .map((node) => {
                const data = node.data as TradeModel | ExecutionModel;
                return {
                  data,
                  entityId:
                    selectedType === 'trade'
                      ? (data as TradeModel).entityId
                      : (data as ExecutionModel).executionId,
                  executionId:
                    selectedType === 'execution'
                      ? (data as ExecutionModel).executionId
                      : undefined,
                };
              });

            if (selectedData.length > 0) {
              try {
                const batchContext = createTradeListContext(selectedData);
                await harmonixService.raiseIntent(
                  'CancelAdjustBatchTrade',
                  toHarmonixContext(batchContext),
                );
                console.log(`Raised batch intent for ${selectedData.length} ${selectedType}s`);
              } catch (error) {
                console.error('Error raising batch intent:', error);
              }
            }
          }
        } else if (selectedNodes.length === 1) {
          if (openCancelDialog) {
            openCancelDialog();
          } else {
            const rowNode = params.node;
            if (rowNode) {
              let eventData: { data: unknown };
              if (rowNode.group && rowNode.childrenAfterFilter?.length === 1) {
                eventData = { data: rowNode.childrenAfterFilter[0].data };
              } else if (rowNode.data) {
                eventData = { data: rowNode.data };
              } else {
                console.warn('No valid data found in row node');
                return;
              }
              try {
                const context = contextItem(eventData);
                await harmonixService.raiseIntent(
                  'CancelAdjustSingleTrade',
                  toHarmonixContext(context),
                );
              } catch (error) {
                console.error('Error raising intent:', error);
              }
            } else {
              console.warn('No row data found for cancel action');
            }
          }
        } else {
          console.warn('No rows selected for cancel action');
        }
      },
    },
    {
      name: 'Cancel and Adjust',
      action: async (params: IMenuActionParams<TradeModel, ExecutionModel>) => {
        if (!params.api || typeof params.api.getSelectedNodes !== 'function') {
          return;
        }
        const selectedNodes = params.api.getSelectedNodes();

        if (selectedNodes.length > 1) {
          const selectedData: EventData[] = selectedNodes
            .filter((node) => node.data)
            .map((node) => {
              const data = node.data as TradeModel | ExecutionModel;
              return {
                data,
                entityId:
                  selectedType === 'trade'
                    ? (data as TradeModel).entityId
                    : (data as ExecutionModel).executionId,
                executionId:
                  selectedType === 'execution'
                    ? (data as ExecutionModel).executionId
                    : undefined,
              };
            });

          if (selectedData.length > 0) {
            try {
              const batchContext = createTradeListContext(selectedData);
              await harmonixService.raiseIntent(
                'CancelAdjustBatchTrade',
                toHarmonixContext(batchContext),
              );
              console.log(
                `Raised batch cancel/adjust intent for ${selectedData.length} ${selectedType}s`,
              );
            } catch (error) {
              console.error('Error raising batch intent:', error);
            }
          }
        } else if (selectedNodes.length === 1) {
          const rowNode = params.node;
          if (rowNode) {
            let eventData: { data: unknown };
            if (rowNode.group && rowNode.childrenAfterFilter?.length === 1) {
              eventData = { data: rowNode.childrenAfterFilter[0].data };
            } else if (rowNode.data) {
              eventData = { data: rowNode.data };
            } else {
              console.warn('No valid data found in row node');
              return;
            }
            try {
              const context = contextItem(eventData);
              await harmonixService.raiseIntent(
                'CancelAdjustSingleTrade',
                toHarmonixContext(context),
              );
            } catch (error) {
              console.error('Error raising intent:', error);
            }
          }
        } else {
          console.warn('No rows selected for cancel and adjust action');
        }
      },
    },
  ];

  if (selectedType === 'execution') {
    menuItems.push({
      name:
        (selectedNodes ?? 0) > 1
          ? MENU_LABEL_UPDATE_TRADER_NOTES
          : MENU_LABEL_UPDATE_TRADER_NOTE,
      action: async (params: IMenuActionParams<any, any>): Promise<void> => {
        if (typeof params.api.getSelectedNodes !== 'function') {
          return;
        }
        if (openUpdateNoteDialog) {
          openUpdateNoteDialog();
        } else {
          console.warn(WARN_UPDATE_NOTE_DIALOG_NOT_CONFIGURED);
        }
      },
    });
  }

  return [...menuItems, 'separator'];
}
