import 'zone.js';
import 'zone.js/testing';
import '@angular/compiler';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';

if (typeof globalThis.structuredClone === 'undefined') {
  (globalThis as { structuredClone: <T>(obj: T) => T }).structuredClone = <T>(
    obj: T,
  ): T => JSON.parse(JSON.stringify(obj)) as T;
}

/* istanbul ignore next */
getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
);
// jest-preset-angular v15+ handles setup automatically through preset
