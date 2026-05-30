# hds-common-search

Standalone Angular multi-select autocomplete with a mega-menu grid / tree result panel and chip-based selections.

## Copy-paste portability

This library is designed to be copy-pasted into any Angular 20+ project. It has **no hard dependencies** on other libraries in this monorepo — all external integrations are wired through `InjectionToken`s and are fully optional.

### Required peer dependencies

Add these to the target project:

```
"@angular/cdk": "^20.0.0"
"primeng": "^20.0.0"
"primeicons": "^7.0.0"
"@primeuix/themes": "^1.0.0"
"rxjs": "^7.0.0"
```

The component templates use **PrimeNG 20** (`p-autocomplete`, `p-floatlabel`, `p-message`, `p-tree`, `p-tooltip`) and **PrimeIcons** classes (`pi pi-times`, etc.).

### Tailwind CSS

The templates use Tailwind utility classes (`flex`, `w-full`, `min-w-0`, `relative`, `truncate`, `px-3`, etc.). If the target project doesn't use Tailwind, either:
- Set up Tailwind (recommended — these are standard utilities)
- Replace each utility with scoped SCSS equivalents

### PrimeNG theme variables

The SCSS reads PrimeNG design tokens (`--p-chip-background`, `--p-inputtext-color`, `--p-surface-100`, `--p-floatlabel-active-font-size`, etc.). Apply a PrimeNG theme at app bootstrap via `providePrimeNG({ theme: { preset: Aura } })` for the variables to resolve.

## Basic usage

```ts
import {
  HdsCommonSearchComponent,
  SearchContext,
  SearchType,
} from './hds-common-search';

@Component({
  imports: [HdsCommonSearchComponent],
  template: `
    <lib-hds-common-search
      [searchContext]="ctx"
      [dropdown]="true"
      (emitSelection)="onPicked($event)"
    />
  `,
})
export class Demo {
  readonly ctx: SearchContext = {
    searchType: SearchType.Symbol,
    dataSourceFn: (query) => this.api.searchSymbols(query),
    initialDataFn: () => this.api.recentSymbols(),
  };

  onPicked(values: CommonSearchValue[]) { ... }
}
```

That's the minimum. The `dataSourceFn` and `initialDataFn` on the SearchContext drive the panel directly — no provider wiring needed.

## Optional integrations (InjectionTokens)

### `LEGACY_DATA_ACCESS_FACADE` — service-based data fallback

If your project has an existing service-based data layer and you don't want to wire `dataSourceFn` / `initialDataFn` per context, provide an adapter implementing the `LegacyDataAccessFacade` interface:

```ts
import {
  LEGACY_DATA_ACCESS_FACADE,
  LegacyDataAccessFacade,
} from './hds-common-search';

@Injectable({ providedIn: 'root' })
export class MyLegacyAdapter implements LegacyDataAccessFacade {
  // implement initialDataPersisted$, getServiceContext, getSuggestedData,
  // getInitialData, loadInitialData, loadPreferences, setPreference
}

providers: [
  { provide: LEGACY_DATA_ACCESS_FACADE, useExisting: MyLegacyAdapter },
],
```

The facade will use this whenever the consumer omits both `dataSourceFn` and `initialDataFn` on a `SearchContext`.

### `IPREFS_STORE` — persistent selections (iprefs)

To persist user selections across sessions (e.g. to localStorage or a remote prefs API), provide a store:

```ts
import { IPREFS_STORE, IprefsStore } from './hds-common-search';

@Injectable({ providedIn: 'root' })
export class MyIprefsStore implements IprefsStore {
  set<T>(key: string, items: T[]): void { /* persist */ }
  get<T>(key: string): T[] { /* read */ }
}

providers: [
  { provide: IPREFS_STORE, useExisting: MyIprefsStore },
],
```

`setPreference()` writes to this store on every confirmed selection. Your `initialDataFn` can read from the same store to render iprefs on focus.

## Component inputs

| Input | Type | Default | Notes |
|---|---|---|---|
| `searchContext` | `SearchContext` | required | Drives the panel: search type, data callbacks, disable rules |
| `inputId` | `string` | auto | DOM id for the input |
| `validators` | `ValidatorFn[]` | `[]` | Form validators |
| `minLengthForInputValue` | `number` | `3` | Min chars before search fires |
| `maxSelection` | `number` | `Infinity` | Max chips allowed |
| `formGroup` | `FormGroup` | — | When set, registers the control under `searchType` |
| `disabled` | `boolean` | `false` | |
| `clearSelection` | `unknown` | — | Toggle to reset programmatically |
| `dropdown` | `boolean` | `false` | Show the chevron toggle |
| `showClear` | `boolean` | `true` | Show the clear-all × |
| `panelMaxHeight` | `string` | `'20rem'` | |
| `panelMinWidth` | `string` | — | Override panel min-width |
| `panelMaxWidth` | `string` | — | Override panel max-width |
| `maxVisibleChips` | `number` | `Infinity` | When exceeded, show `"N Items"` summary chip |

## Outputs

| Output | Type | Notes |
|---|---|---|
| `emitSelection` | `CommonSearchValue[]` | IDs / emit-field values of all currently selected items |
| `clearEvent` | `CommonSearchValue[]` | Fires on clear-all |
| `resultsChange` | `unknown[]` | Full data records of selected items |
