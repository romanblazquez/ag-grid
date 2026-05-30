/*
 * Copyright (c) 2025 FMR Corp.
 * All Rights Reserved.
 *
 * Fidelity Confidential Information.
 * Created on May 15, 2025
 */

import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { SearchService } from './search.service';
import { Context } from '../../model/context.model';

@Injectable()
class SearchServiceExtended extends SearchService<any> {
  public override search(
    query: string,
    serviceContext?: Context | undefined,
  ): Observable<any[]> {
    throw new Error('Method not implemented.');
  }

  public override loadInitialData(): Observable<any> {
    throw new Error('Method not implemented.');
  }

  public override getInitialData(serviceContext: Context): Observable<any[]> {
    throw new Error('Method not implemented.');
  }
}

interface MockObject {
  name: string;
  lastname: string;
}

describe('SearchService', () => {
  let service: SearchServiceExtended;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SearchServiceExtended],
    });
    service = TestBed.inject(SearchServiceExtended);
  });

  describe('filterByQueryMultiselect', () => {
    it('should return comma separated items even if it has space in them', () => {
      //   Arrange
      const mockObjects: MockObject[] = [
        { name: 'a', lastname: 'b' },
        { name: 'c', lastname: 'd' },
        { name: 'e', lastname: 'f' },
      ];
      const query = 'a, c ';
      const getters = [(entity: MockObject) => entity.name];
      //   Act
      const result = service.filterByQueryMultiselect(
        mockObjects,
        query,
        getters,
      );
      //   Assert
      expect(result).toEqual([
        { name: 'a', lastname: 'b' },
        { name: 'c', lastname: 'd' },
      ]);
    });
    // Assert
  });
  describe('filterByQuerySingleSelect', () => {
    it('should try to find objects by the query', () => {
      //   Arrange
      const mockObjects: MockObject[] = [
        { name: 'a', lastname: 'b' },
        { name: 'ca', lastname: 'd' },
        { name: 'e', lastname: 'fa' },
      ];
      const query = 'a';
      const getters = [
        (entity: MockObject) => entity.name,
        (entity: MockObject) => entity.lastname,
      ];
      //   Act
      const result = service.filterByQueryMultiselect(
        mockObjects,
        query,
        getters,
      );
      //   Assert
      expect(result).toEqual(mockObjects);
    });
    // Assert
  });
});
