/*
 * Copyright (c) 2023 FMR Corp.
 * All Rights Reserved.
 *
 * Fidelity Confidential Information.
 * Created on 25/04/25, 4:51 PM
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, mergeMap, Observable, tap } from 'rxjs';
import { ApiName, ServiceConfig } from '../../model/service-config.model';
import { svcConfig } from '../../model/external-services.constant';
import { SearchService } from './search.service';
import { Context } from '../../model/context.model';
import { Item, TreeNode } from '../../model/tree-result.model';

/** Local interfaces replacing proprietary @fmr-pr000539/eqt-ngrx-refdata-services-module */
export interface Code {
  code: string;
  description: string;
}

export interface CodeValue {
  name: string;
  codes: Code[];
}

export interface CodeValueResponse {
  codeValues: CodeValue[];
}

@Injectable()
export class CodeValueService extends SearchService<CodeValue> {
  public apiRecord: Record<ApiName, ServiceConfig> = svcConfig;

  public constructor(private readonly http: HttpClient) {
    super();
  }

  public override getInitialData(serviceContext: Context): Observable<CodeValue[]> {
    return this.search('', serviceContext) as Observable<CodeValue[]>;
  }

  // eslint-disable-next-line max-lines-per-function
  public search(query: string, serviceContext: Context): Observable<any> {
    const dataPool = this.persistedData$.value.length
      ? this.persistedData$
      : this.getCodeValues();

    return dataPool.pipe(
      map((codes) => {
        return this.filterAndTransform(codes, serviceContext, query);
      }),
    );
  }

  private filterAndTransform(
    codes: CodeValue[],
    serviceContext: Context,
    query: string,
  ): TreeNode[] {
    // The mock server returns human-readable group names ("Equity", "Fixed Income", etc.)
    // rather than the legacy Fidelity internal codes ("EQUITY_IV_TYPES", "VALID_STRUCTURE_TYPE").
    // Accept every group when either ApiName is present so the POC receives data.
    const wantsIVTypes = serviceContext.apiNames?.includes(ApiName.GetIVTypes) ?? false;
    const wantsStructureTypes =
      serviceContext.apiNames?.includes(ApiName.GetStructureTypes) ?? false;

    return codes
      .filter(() => wantsIVTypes || wantsStructureTypes)
      .map((codeValue) => this.queryBasedFilter(codeValue, query, serviceContext))
      .map((codeValue) => this.buildCodeValueTreeNode(codeValue, serviceContext))
      .filter((treeNode) => treeNode.children && treeNode.children.length > 1);
  }

  private buildCodeValueTreeNode(
    codeValue: CodeValue,
    serviceContext: Context,
  ): TreeNode {
    const parentItems: Array<Item> = [];
    const item: Item = {
      name: codeValue.name,
      value: codeValue.name,
      visible: true,
    };
    parentItems.push(item);

    const headerItems: Item[] = serviceContext.detailHeaders.map((header, i) => {
      return {
        name: serviceContext.detailFields.filter((d) => d.visible)[i].name,
        value: header,
        visible: true,
      };
    });

    const childHeader: TreeNode = {
      header: true,
      items: headerItems,
    };

    const childTreeNodes: TreeNode[] = [];
    childTreeNodes.push(childHeader);

    codeValue.codes.forEach((code: { code: any; description: any }) => {
      const childItemCode: Item = {
        name: 'code',
        value: code.code,
        visible: true,
      };
      const childItemDescription: Item = {
        name: 'description',
        value: code.description,
        visible: true,
      };
      const childTreeNode: TreeNode = {
        items: [childItemCode, childItemDescription],
        header: false,
      };
      childTreeNodes.push(childTreeNode);
    });

    return {
      items: parentItems,
      children: childTreeNodes,
      header: false,
    };
  }

  public loadInitialData(): Observable<CodeValue[]> {
    return this.getCodeValues().pipe(
      tap((code) => {
        this.persistedData$.next(code);
      }),
    );
  }

  public getCodeValues(): Observable<CodeValue[]> {
    return this.apiRecord.GetIVTypes.url.pipe(
      mergeMap((url) =>
        this.http.get<CodeValueResponse>(url).pipe(
          map((response) => response.codeValues),
        ),
      ),
    );
  }

  private queryBasedFilter(
    codeValue: CodeValue,
    query: string,
    context: Context,
  ): CodeValue {
    let newCodeValue: CodeValue = JSON.parse(JSON.stringify(codeValue)) as CodeValue;
    const filterMethod = context.multiselect
      ? this.filterByQueryMultiselect
      : this.filterByQuerySingleSelect;
    newCodeValue = {
      ...codeValue,
      codes: filterMethod<Code>(newCodeValue.codes, query, [
        (code: Code) => code.code,
        (code: Code) => code.description,
      ]),
    };
    newCodeValue.codes.sort((a, b) => a.code.localeCompare(b.code));
    return newCodeValue;
  }
}
