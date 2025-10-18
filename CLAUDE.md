# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **Nx monorepo** for a trading platform built with **Angular 20** and **TypeScript**. The platform features a shell application that displays trade data using **AG Grid Community** edition.

## Architecture

### Monorepo Structure

The codebase follows Nx monorepo best practices with a domain-driven library organization:

```
apps/
  shell/                    # Application shell - minimal host/container
  shell-e2e/               # E2E tests for shell app

libs/
  trade-grid/              # Feature library: AG Grid-based trade grid component
  shell/
    feature/               # Shell feature - main trading dashboard UI
  shared/
    data-access/           # Shared data services, state management
    ui-components/         # Shared reusable UI components
```

**Why "shell"?** The shell app follows the "application shell" pattern - it's a thin container responsible for:
- Bootstrapping Angular
- Top-level routing configuration
- Loading feature libraries
- Minimal application-level logic

The actual business logic lives in feature libraries (`libs/shell/feature`), keeping the app itself lightweight and focused on orchestration.

### Library Types & Conventions

Libraries follow Nx categorization patterns:

- **Feature libraries** (`feature/`): Smart components, routing, domain-specific logic
  - Example: `libs/shell/feature` - Contains the main trading dashboard that uses the trade-grid
  - These libraries coordinate between UI components and data services
  - Can import from data-access and ui libraries

- **Data-access libraries** (`data-access/`): Services, state management, API calls
  - Example: `libs/shared/data-access` - Contains `TradeDataService` with RxJS observables
  - Provides data streams, simulates real-time updates (every 5 seconds)
  - Services are `providedIn: 'root'` for singleton behavior

- **UI libraries** (`ui-components/`): Presentational/dumb components
  - Example: `libs/trade-grid` - Reusable AG Grid component
  - Example: `libs/shared/ui-components` - Contains `StatsCard` for dashboard metrics
  - Pure presentation, receive data via @Input, emit events via @Output
  - No business logic or service dependencies

- **Utility libraries**: Pure functions, helpers (add as needed with `util/` suffix)

**Dependency Flow**: Apps → Features → Data-access/UI → Utils (enforced by Nx)

### Import Paths

All libraries use TypeScript path mappings defined in `tsconfig.base.json`:
- `@trade-platform/trade-grid` - Trade grid component library
- `@trade-platform/shell/feature` - Shell feature modules (trading dashboard)
- `@trade-platform/shared/data-access` - Shared data services (TradeDataService)
- `@trade-platform/shared/ui-components` - Shared UI components (StatsCard)

**Real-world Example:**
```typescript
// In libs/shell/feature - Smart component
import { TradeDataService } from '@trade-platform/shared/data-access';
import { StatsCard } from '@trade-platform/shared/ui-components';
import { TradeGrid } from '@trade-platform/trade-grid';

// Feature coordinates between service and UI
constructor(private tradeService: TradeDataService) {}
ngOnInit() {
  this.tradeService.getTrades().subscribe(trades => {
    this.tradeData = trades; // Pass to TradeGrid
    this.stats = this.calculateStats(trades); // Pass to StatsCard
  });
}
```

## Common Commands

### Development

```bash
# Serve the shell application (dev server)
npx nx serve shell

# Build the shell application for production
npx nx build shell

# Build a specific library
npx nx build trade-grid
npx nx build shell-feature

# Run the dependency graph visualizer
npx nx graph
```

### Testing

```bash
# Run all tests
npx nx run-many -t test

# Test a specific project
npx nx test shell
npx nx test trade-grid

# Run tests in watch mode
npx nx test shell --watch

# Run tests with coverage
npx nx test shell --coverage
npx nx run-many -t test --configuration=ci  # CI mode with coverage
```

### Linting

```bash
# Lint all projects
npx nx run-many -t lint

# Lint a specific project
npx nx lint shell
npx nx lint trade-grid

# Auto-fix linting issues
npx nx lint shell --fix
```

### E2E Testing

```bash
# Run E2E tests (Cypress)
npx nx e2e shell-e2e

# Open Cypress UI
npx nx open-cypress shell-e2e

# Run E2E in CI mode
npx nx e2e-ci shell-e2e
```

### Code Generation

```bash
# Generate a new Angular library
npx nx g @nx/angular:library --name=my-lib --directory=libs/shared/my-lib --buildable=true --standalone=true

# Generate a new Angular application
npx nx g @nx/angular:app my-app

# Generate a component in a library
npx nx g @nx/angular:component my-component --project=trade-grid --export=true

# Generate a service
npx nx g @nx/angular:service my-service --project=data-access

# List available generators
npx nx list @nx/angular
```

### Project Information

```bash
# Show all available targets for a project
npx nx show project shell

# List all projects
npx nx show projects

# View affected projects (based on git changes)
npx nx affected:graph
```

## Technology Stack

- **Framework**: Angular 20 (standalone components)
- **Language**: TypeScript 5.9
- **Build System**: Nx 21.6.5 with Angular CLI 20
- **Grid Component**: AG Grid Community 34.2.0 + AG Grid Angular
- **Styling**: SCSS
- **Testing**: Jest + Cypress
- **Linting**: ESLint 9 + Angular ESLint + Prettier

## Key Technical Details

### AG Grid Integration

The `trade-grid` library demonstrates AG Grid Community integration:

- **Component**: `libs/trade-grid/src/lib/trade-grid/trade-grid.ts`
- **Data Model**: `TradeData` interface exported from the library
- **Theming**: Uses AG Grid v33+ Theming API with `themeQuartz`
- **Features**: Sorting, filtering, pagination (50 rows/page), multi-row selection, animated rows
- **Module Registration**: `AllCommunityModule` is registered in the trade-grid component

**IMPORTANT**: AG Grid Community requires module registration. This is already done in `libs/trade-grid/src/lib/trade-grid/trade-grid.ts`:
```typescript
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
ModuleRegistry.registerModules([AllCommunityModule]);
```

**Theming**: AG Grid v33+ uses the new Theming API (not CSS files). Apply theme via the `[theme]` property:
```typescript
// In component
theme = themeQuartz;

// In template
<ag-grid-angular [theme]="theme" ...></ag-grid-angular>
```

To use the trade grid in other components:
```typescript
import { TradeGrid, TradeData } from '@trade-platform/trade-grid';
```

### Angular Configuration

- **Standalone Components**: All components use Angular 20's standalone API (no NgModules)
- **Routing**: Configured via `app.routes.ts` using functional routing
- **Build Tool**: Vite-based Angular build (@angular/build)
- **Server-Side Rendering**: Disabled (SSR=false)

### Build Configuration

- **Production builds** exclude test files automatically via `namedInputs` in `nx.json`
- **Caching**: Enabled for all build, lint, and test targets
- **Dependencies**: Libraries must be built before consuming applications (configured in `targetDefaults`)

## Development Workflow

### Adding a New Feature Library

1. Generate the library with appropriate categorization:
   ```bash
   npx nx g @nx/angular:library --name=feature-name --directory=libs/domain/feature --buildable=true --standalone=true
   ```

2. Export public API from `libs/domain/feature/src/index.ts`

3. Import using the path mapping: `@trade-platform/domain/feature`

### Working with AG Grid

When adding AG Grid features:
- **Module Registration**: Always ensure `ModuleRegistry.registerModules([AllCommunityModule])` is called before using AG Grid
- **Theming**: Use the Theming API (v33+) with `themeQuartz`, `themeAlpine`, or `themeBalham` - do NOT import CSS theme files
- **Row Selection**: Use object syntax `rowSelection: { mode: 'multiRow' }` instead of deprecated string syntax
- Column definitions use typed `ColDef<T>` with your data model
- Value formatters handle display transformations (e.g., currency, dates)
- Grid options control behavior (pagination, selection, animations)
- The `gridReady` event provides access to the Grid API for programmatic control

If creating a new component with AG Grid, add these imports and registration:
```typescript
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community';
ModuleRegistry.registerModules([AllCommunityModule]);

// In component class
theme = themeQuartz;

// In template
<ag-grid-angular [theme]="theme" [rowData]="data" [columnDefs]="columns"></ag-grid-angular>
```

### Running a Single Test File

```bash
# Using Jest's test pattern matching
npx nx test trade-grid --testFile=trade-grid.spec.ts

# Or with a path pattern
npx nx test trade-grid --testPathPattern=trade-grid.spec
```

## Project-Specific Patterns

### Component Naming

- Library selectors use `lib-` prefix (e.g., `lib-trade-grid`)
- App selectors use `app-` prefix (e.g., `app-root`)
- Generated components default to these conventions via Nx generators

### Dependency Constraints

Nx enforces architectural boundaries. Generally:
- Apps can depend on any library
- Feature libraries can depend on data-access and ui libraries
- Data-access and ui libraries should not depend on feature libraries
- Shared libraries should have minimal dependencies

Check dependency graph: `npx nx graph`

## Troubleshooting

### Build Issues

If you encounter build errors:
1. Clear Nx cache: `npx nx reset`
2. Remove node_modules and reinstall: `rm -rf node_modules && npm install`
3. Check for circular dependencies: `npx nx graph`

### AG Grid Styling Issues

**DO NOT** import AG Grid CSS files in v33+. The Theming API is used instead:

```typescript
// ✅ Correct (v33+)
import { themeQuartz } from 'ag-grid-community';
theme = themeQuartz;
// In template: [theme]="theme"

// ❌ Incorrect - DO NOT USE
@import 'ag-grid-community/styles/ag-grid.css';
class="ag-theme-alpine"
```

If you see theming errors, ensure:
1. No CSS imports in `styles.scss`
2. Using `[theme]` property binding in template
3. Theme is imported from `ag-grid-community`
