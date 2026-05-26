import { inject, Injectable, InjectionToken } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, map, Observable, of, tap } from 'rxjs';
import { DataAccessFacadeService } from '../data-access-facade.service';
import { TreeNode } from '../../model/tree-node.model';
import { SearchService } from './search.service';

export const CODEVALUE_SERVICE_URL = new InjectionToken<string>(
  'CODEVALUE_SERVICE_URL',
);

export interface CodeValueCode {
  code: string;
  description: string;
}

export interface CodeValue {
  name: string;
  codes: CodeValueCode[];
}

interface CodeValueResponse {
  codeValues: CodeValue[];
}

@Injectable()
export class CodeValueService extends SearchService<TreeNode> {
  /** Raw code values, separate from the TreeNode cache in persistedData$. */
  private readonly rawCodeValues$ = new BehaviorSubject<CodeValue[]>([]);

  private readonly http = inject(HttpClient);
  private readonly url = inject(CODEVALUE_SERVICE_URL, { optional: true });
  private readonly dataCache = inject(DataAccessFacadeService);

  search(query: string): Observable<TreeNode[]> {
    return this.getCodeValues().pipe(
      map((codeValues) => this.filterAndBuildTree(codeValues, query)),
    );
  }

  loadInitialData(): Observable<CodeValue[]> {
    return this.getCodeValues().pipe(
      tap((values) => this.rawCodeValues$.next(values)),
    );
  }

  getInitialData(): Observable<TreeNode[]> {
    const cachedSelections = this.dataCache.getPreference<Record<string, unknown>>(
      'instrumentType',
    );
    if (cachedSelections.length) {
      return of(this.buildSelectionTree(cachedSelections));
    }
    if (this.rawCodeValues$.value.length) {
      return of(this.filterAndBuildTree(this.rawCodeValues$.value, ''));
    }
    return this.getCodeValues().pipe(
      tap((values) => this.rawCodeValues$.next(values)),
      map((values) => this.filterAndBuildTree(values, '')),
    );
  }

  getCodeValues(): Observable<CodeValue[]> {
    if (!this.url) return of([]);
    return this.http
      .get<CodeValueResponse>(this.url)
      .pipe(map((res) => res.codeValues ?? []));
  }

  toDataSourceFn() {
    return (query: string): Observable<TreeNode[]> =>
      query ? this.search(query) : this.getInitialData();
  }

  private filterAndBuildTree(
    codeValues: CodeValue[],
    query: string,
  ): TreeNode[] {
    return codeValues
      .map((cv) => {
        const filteredCodes = query
          ? cv.codes.filter(
              (c) =>
                c.code.toLowerCase().includes(query.toLowerCase()) ||
                c.description.toLowerCase().includes(query.toLowerCase()),
            )
          : cv.codes;
        return { cv, filteredCodes };
      })
      .filter(({ filteredCodes }) => filteredCodes.length > 0)
      .map(({ cv, filteredCodes }) =>
        this.buildTreeNode(cv.name, filteredCodes),
      );
  }

  private buildTreeNode(
    categoryName: string,
    codes: CodeValueCode[],
  ): TreeNode {
    return {
      items: [{ name: 'description', value: categoryName, visible: true }],
      children: codes.map((code) => ({
        items: [
          { name: 'description', value: code.description, visible: true },
          { name: 'code', value: code.code, visible: true },
        ],
        header: false,
      })),
      header: false,
    };
  }

  private buildSelectionTree(
    selections: Record<string, unknown>[],
  ): TreeNode[] {
    return selections.map((selection) => ({
      items: [
        {
          name: 'description',
          value: selection['description'] ?? selection['name'] ?? '',
          visible: true,
        },
        {
          name: 'code',
          value: selection['code'] ?? '',
          visible: true,
        },
      ],
      header: false,
    }));
  }
}
