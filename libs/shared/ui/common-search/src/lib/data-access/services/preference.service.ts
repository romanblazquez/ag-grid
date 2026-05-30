/*
 * Copyright (c) 2023 FMR Corp.
 * All Rights Reserved.
 *
 * Fidelity Confidential Information.
 * Created on 6/20/23, 4:51 PM
 */
import {
  BehaviorSubject,
  combineLatestWith,
  debounceTime,
  filter,
  Observable,
  of,
  Subject,
  take,
} from 'rxjs';
import { Injectable } from '@angular/core';
import {
  NodeName,
  PreferenceContext,
} from '../../model/preference-context.model';
import { map } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Item } from '../../model/tree-result.model';

export interface TreePrefNode {
  header: string;
  items?: Item[];
  children?: TreePrefNode[];
}

/** In-memory stub preference store replacing @ngrx/store + @fmr-pr000539/eqt-ngrx-user-module */
const _prefState$ = new BehaviorSubject<Record<string, Record<string, unknown[]>>>({});

function _getPreferenceState(): Observable<Record<string, Record<string, unknown[]>>> {
  return _prefState$.asObservable();
}

function _setPreference(nodePath: string, key: string, value: unknown[]): void {
  const current = _prefState$.value;
  _prefState$.next({
    ...current,
    [nodePath]: { ...(current[nodePath] ?? {}), [key]: value },
  });
}

function _requestAllPreferences(_nodePaths: string[], _tenantName: string): void {
  // no-op stub
}

@Injectable({ providedIn: 'root' })
export class PreferenceService {
  protected debounceTime = 300;
  protected readonly nodeInput$ = new Subject<string>();
  protected readonly nodeBuffer = new Set<string>();

  /** Runtime environment name — override by providing 'RUNTIME_ENV' token */
  private readonly runtimeEnv = 'DEV';
  /** Application name — override by providing 'APP_NAME' token */
  private readonly appName = 'TradePlatform';

  public constructor() {
    this.handleNodeInput();
  }

  public requestAllPreferences(
    preferenceContext: PreferenceContext | undefined,
  ): void {
    if (!preferenceContext) return;
    const node = this.generateNodePath(preferenceContext.nodeName);
    this.nodeBuffer.add(node);
    this.nodeInput$.next(node);
  }

  /**
   * Sets preference to iPreference using node and key provided in preferenceContext + app name.
   * It will avoid duplicates.
   * @param preferenceContext Needed for extracting nodeName and key
   * @param value New values to add to Ipreference
   */
  public setPreference(
    preferenceContext: PreferenceContext | undefined,
    value: any[],
  ): void {
    //   set preference using ngrx set preference
    if (!preferenceContext) return;
    this.getPreferenceState(preferenceContext)
      .pipe(take(1))
      .subscribe((preferences) => {
        const newPreferences = this.concatPreference(
          preferences,
          value,
          preferenceContext.limit,
        );
        _setPreference(
          this.generateNodePath(preferenceContext.nodeName),
          preferenceContext.key,
          newPreferences,
        );
      });
  }

  public setTreePreference(
    preferenceContext: PreferenceContext | undefined,
    value: TreePrefNode[],
  ): void {
    if (!preferenceContext) return;
    this.getPreferenceState(preferenceContext)
      .pipe(take(1))
      .subscribe((current) => {
        const merged = this.concatTreePreference(
          current as TreePrefNode[] | undefined,
          value,
          preferenceContext.limit,
        );
        _setPreference(
          this.generateNodePath(preferenceContext.nodeName),
          preferenceContext.key,
          merged,
        );
      });
  }

  private concatTreePreference(
    current: TreePrefNode[] | undefined,
    incoming: TreePrefNode[],
    limit: number,
  ): TreePrefNode[] {
    const prefMap = new Map<string, TreePrefNode>();

    const isEmptyNode = (n: TreePrefNode): boolean =>
      (!n.items || n.items.length === 0) &&
      (!n.children || n.children.length === 0);

    const cloneNode = (n: TreePrefNode): TreePrefNode => ({
      header: n.header,
      items: n.items ? n.items.map((i) => ({ ...i })) : [],
      children: n.children ? n.children.map((c) => cloneNode(c)) : [],
    });

    const getKey = (n: TreePrefNode): string => {
      const item = n.items?.[0];
      if (!item?.value) return '';
      return String(item.value).trim().replace(/\s+/g, ' ');
    };

    const addOrMerge = (node: TreePrefNode): void => {
      if (isEmptyNode(node)) return;
      const key = getKey(node);
      if (!key) return;
      if (!prefMap.has(key)) {
        prefMap.set(key, cloneNode(node));
        return;
      }
      const target = prefMap.get(key)!;
      const mergedChildren = [
        ...(node.children ?? []).map(cloneNode),
        ...(target.children ?? []),
      ];

      const childSeen = new Set<string>();
      const dedupChildren: TreePrefNode[] = [];
      for (const c of mergedChildren) {
        if (isEmptyNode(c)) continue;
        const ck = getKey(c);
        if (ck && !childSeen.has(ck)) {
          childSeen.add(ck);
          dedupChildren.push(c);
        }
      }
      target.children = dedupChildren;
      if (node.items?.length) {
        const existing = target.items ?? [];
        const allItems = [...node.items.map((i) => ({ ...i })), ...existing];
        const itemSeen = new Set<string>();
        target.items = allItems.filter((it) => {
          const sig = `${it.name}:${JSON.stringify(it.value)}`;
          if (itemSeen.has(sig)) return false;
          itemSeen.add(sig);
          return true;
        });
      }
    };

    incoming.filter((n) => !isEmptyNode(n)).forEach(addOrMerge);
    current?.filter((n) => !isEmptyNode(n)).forEach(addOrMerge);

    return Array.from(prefMap.values())
      .filter((n) => !isEmptyNode(n))
      .slice(0, limit);
  }

  public getPreference<T extends Record<string, any>>(
    filterKey: string,
    preferenceContext?: PreferenceContext,
    dataPool?: BehaviorSubject<T[]>,
  ): Observable<T[]> {
    if (dataPool) {
      return this.getPreferenceState(preferenceContext).pipe(
        combineLatestWith(dataPool),
        filter(([preferenceList, dataPool]) => dataPool.length > 0),
        map(([preferenceList, dataPool]) => {
          if (!preferenceList) return [];
          const iPrefItemsList: T[] = [];
          for (const item of preferenceList) {
            const result = dataPool.find((dataItem) => {
              return dataItem[filterKey] === item;
            });
            if (result) {
              iPrefItemsList.push(result);
            }
          }
          return iPrefItemsList;
        }),
      );
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return this.getPreferenceState(preferenceContext).pipe(
        map((prefItems) => {
          if (!prefItems) return [];
          const items: any[] = [];
          prefItems.forEach((item) => {
            if (item) items.push(item);
          });
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return items;
        }),
      );
    }
  }

  protected handleNodeInput(): void {
    this.nodeInput$
      .pipe(debounceTime(this.debounceTime), takeUntilDestroyed())
      .subscribe(() => {
        const uniqueNodes = Array.from(this.nodeBuffer);
        this.nodeBuffer.clear();
        this.handleBatchedNodes(uniqueNodes);
      });
  }

  protected getPreferenceState(
    preferenceContext?: PreferenceContext,
  ): Observable<any[] | undefined> {
    if (!preferenceContext) return of(undefined);
    const node: string = this.generateNodePath(preferenceContext.nodeName);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return _getPreferenceState().pipe(
      map((state) => {
        if (!state[node]) return undefined;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return (state[node] as Record<string, unknown[]>)[preferenceContext.key as string];
      }),
    );
  }

  protected concatPreference(
    currentPreferences: any[] | undefined,
    newPreferences: any[],
    limit: number,
  ): any[] {
    const newPreferencesSet = new Set<any>();
    let newPreferenceList = currentPreferences
      ? // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        [...newPreferences, ...currentPreferences].filter(
          (o, index, arr) =>
            arr.findIndex(
              (item) => JSON.stringify(item) === JSON.stringify(o),
            ) === index,
        )
      : newPreferences;
    for (const preference of newPreferenceList) {
      newPreferencesSet.add(preference);
    }
    newPreferenceList = Array.from(newPreferencesSet.values());
    while (newPreferenceList.length > limit) newPreferenceList.pop();
    return newPreferenceList;
  }

  protected handleBatchedNodes(nodes: string[]): void {
    _requestAllPreferences(nodes, 'EquityTrading');
  }

  protected generateNodePath(nodeName: NodeName): string {
    return `${this.runtimeEnv}:${this.appName}:${nodeName}`;
  }
}
