/*
 * Copyright (c) 2025 FMR Corp.
 * All Rights Reserved.
 *
 * Fidelity Confidential Information.
 * Created on May 12, 2025
 */

import { TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import { getBrokerServiceUrl } from '@fmr-pr000539/shared/data-access/ngrx-stores/parent-broker-ngrx-store';
import { PreferenceService } from './preference.service';
import {
  NodeName,
  PreferenceContext,
  PreferenceKey,
} from '../../model/preference-context.model';
import { setPreference } from '@fmr-pr000539/eqt-ngrx-user-module';
import { RuntimeConfigExt } from '@fmr-pr000539/eqt-ames-conf-preset';
import { Inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { AmesConfig } from '@fmr-pr000264/ames-global-config';

@Injectable()
class PreferenceServiceExtended extends PreferenceService {
  nodeBufferExtended: Set<string>;
  debounceTimeExtended: number;
  nodeInputExtended$: Subject<string>;

  constructor(
    store: Store,
    runtimeEnvConfig: RuntimeConfigExt,
    @Inject('amesconfig') amesConfig: AmesConfig,
  ) {
    // @ts-ignore
    super(store, runtimeEnvConfig, amesConfig);
    this.nodeBufferExtended = this['nodeBuffer'];
    this.nodeInputExtended$ = this['nodeInput$'];
    this.debounceTimeExtended = this['debounceTime'];
  }

  handleNodeInputExtended(): void {
    super.handleNodeInput();
  }

  getPreferenceStateExtended(
    preferenceContext?: PreferenceContext,
  ): Observable<any[] | undefined> {
    return super.getPreferenceState(preferenceContext);
  }

  concatPreferenceExtended(
    currentPreferences: any[] | undefined,
    newPreferences: any[],
    limit: number,
  ): any[] {
    return super.concatPreference(currentPreferences, newPreferences, limit);
  }

  handleBatchedNodesExtended(nodes: string[]): void {
    super.handleBatchedNodes(nodes);
  }

  generateNodePathExteded(nodeName: NodeName): string {
    return super.generateNodePath(nodeName);
  }
}

describe('ParentBrokerService', () => {
  let service: PreferenceServiceExtended;
  let store: MockStore;
  let dispatchSpy: jest.SpyInstance;
  const url = 'url';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PreferenceServiceExtended,
        { provide: RuntimeConfigExt, useValue: { logicalEnvironment: 'SIT' } },
        { provide: 'amesconfig', useValue: { appName: 'appName' } },
        provideMockStore({
          selectors: [
            {
              selector: getBrokerServiceUrl,
              value: url,
            },
          ],
        }),
      ],
    });
    jest.useFakeTimers();
    service = TestBed.inject(PreferenceServiceExtended);
    store = TestBed.inject(MockStore);
    dispatchSpy = jest.spyOn(store, 'dispatch');
  });

  it('should be created', () => {
    // Assert
    expect(service).toBeTruthy();
  });

  it('should handle node inputs on construction', () => {
    const handleBatchedNodesSpy = jest.spyOn(
      service as any,
      'handleBatchedNodes',
    );
    service.nodeInputExtended$.next('new node');

    jest.advanceTimersByTime(service.debounceTimeExtended + 100);

    expect(handleBatchedNodesSpy).toHaveBeenCalled();
  });

  describe('handleNodeInput', () => {
    it('it should batch buffered nodes after debounce time', () => {
      service.nodeBufferExtended.add('A');
      service.nodeBufferExtended.add('B');
      service.nodeInputExtended$.next('A');
      service.nodeInputExtended$.next('B');

      const handleBatchNodesSpy = jest.spyOn(
        service as any,
        'handleBatchedNodes',
      );

      expect(handleBatchNodesSpy).not.toHaveBeenCalled();

      // fast forward
      jest.advanceTimersByTime(service.debounceTimeExtended + 100);

      expect(handleBatchNodesSpy).toHaveBeenCalledWith(['A', 'B']);
      expect(service.nodeBufferExtended.size).toBe(0);
    });
  });

  describe('setPreference', () => {
    it('it should dispatch setPreference action', () => {
      // Arrange
      const newPreferences: any[] = ['A', 'B'];
      const nodePath = 'rand';
      const preferenceContext: PreferenceContext = {
        nodeName: NodeName.Broker,
        key: PreferenceKey.Broker,
        limit: 5,
      };
      jest
        .spyOn(service as any, 'concatPreference')
        .mockReturnValue(newPreferences);
      jest.spyOn(service as any, 'generateNodePath').mockReturnValue(nodePath);
      jest
        .spyOn(service as any, 'getPreferenceState')
        .mockReturnValue(of(['D']));

      // Act
      service.setPreference(preferenceContext, ['C']);

      // Assert
      expect(dispatchSpy).toHaveBeenCalledWith(
        setPreference({
          nodePath: 'rand',
          key: preferenceContext.key,
          value: newPreferences,
        }),
      );
    });
    it('it should avoid saving duplicates', () => {
      const currentPreferences = ['A', 'B', 'C'];
      const newPreferences = ['C', 'D'];
      const expectedResultPreferences = ['C', 'D', 'A', 'B'];

      const resultPreferences = service.concatPreferenceExtended(
        currentPreferences,
        newPreferences,
        5,
      );
      expect(resultPreferences).toEqual(expectedResultPreferences);
    });
    it('it should limit number of preferences', () => {
      const currentPreferences = ['A', 'B', 'C'];
      const newPreferences = ['C', 'D', 'F', 'G'];
      const expectedResultPreferences = ['C', 'D', 'F', 'G', 'A'];

      const resultPreferences = service.concatPreferenceExtended(
        currentPreferences,
        newPreferences,
        5,
      );

      expect(resultPreferences).toEqual(expectedResultPreferences);
    });
  });

  describe('getPreference', () => {
    interface DataObject {
      shortname: string;
    }

    it('should return a list of objects found by filterKey', () => {
      // Arrange
      const dataPool = new BehaviorSubject<DataObject[]>([
        { shortname: 'A' },
        { shortname: 'B' },
      ]);
      const filterKey = 'shortname';
      const preferenceContext: PreferenceContext = {
        key: PreferenceKey.Broker,
        nodeName: NodeName.Broker,
        limit: 5,
      };
      jest
        .spyOn(service, 'getPreferenceStateExtended')
        .mockReturnValue(of(['A']));

      //   Act
      const preference = service.getPreference(
        filterKey,
        preferenceContext,
        dataPool,
      );

      preference.subscribe((result) => {
        //   assert
        expect(result).toEqual({ shortname: 'A' });
      });
    });

    it('should handle empty preferences gracefully', () => {
      // Arrange
      const dataPool = new BehaviorSubject<DataObject[]>([
        { shortname: 'A' },
        { shortname: 'B' },
      ]);
      const filterKey = 'shortname';
      const preferenceContext: PreferenceContext = {
        key: PreferenceKey.Broker,
        nodeName: NodeName.Broker,
        limit: 5,
      };
      jest.spyOn(service, 'getPreferenceStateExtended').mockReturnValue(of([]));

      //   Act
      const preference = service.getPreference(
        filterKey,
        preferenceContext,
        dataPool,
      );

      preference.subscribe((result) => {
        //   assert
        expect(result).toBeUndefined();
      });
    });

    it('should handle undefined preferences', () => {
      // Arrange
      const dataPool = new BehaviorSubject<DataObject[]>([
        { shortname: 'A' },
        { shortname: 'B' },
      ]);
      const filterKey = 'shortname';
      const preferenceContext: PreferenceContext = {
        key: PreferenceKey.Broker,
        nodeName: NodeName.Broker,
        limit: 5,
      };
      jest
        .spyOn(service, 'getPreferenceStateExtended')
        .mockReturnValue(of(undefined));

      //   Act
      const preference = service.getPreference(
        filterKey,
        preferenceContext,
        dataPool,
      );

      preference.subscribe((result) => {
        //   assert
        expect(result).toBeUndefined();
      });
    });
  });

  describe('generateNodePath', () => {
    it('should generate correct node path for broker', () => {
      const nodePath = service.generateNodePathExteded(NodeName.Broker);
      expect(nodePath).toContain('appName');
      expect(nodePath).toContain('SIT');
    });
  });
});
