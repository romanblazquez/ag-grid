# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **Nx monorepo** for an EQT Activity trading platform built with **Angular 20** and **TypeScript**. The platform features an eqt-activity application that displays trade data using **AG Grid Enterprise** edition.

## Architecture

### Monorepo Structure

The codebase follows Nx monorepo best practices with a domain-driven library organization:

```
apps/
  eqt-activity/             # Application - EQT Activity trading platform
  eqt-activity-e2e/        # E2E tests for eqt-activity app

libs/
  trade-grid/              # Feature library: AG Grid-based trade grid component
  shell/
    feature/               # Shell feature - main trading dashboard UI
  shared/
    data-access/           # Shared data services, state management
    ui-components/         # Shared reusable UI components
```

**About the Application:** The eqt-activity app is the main trading platform application. It provides a comprehensive trading dashboard with real-time trade data, advanced filtering, grouping capabilities, and professional UI components designed for financial trading environments.

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
# Serve the eqt-activity application (dev server)
npx nx serve eqt-activity

# Build the eqt-activity application for production
npx nx build eqt-activity

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
npx nx test eqt-activity
npx nx test trade-grid

# Run tests in watch mode
npx nx test eqt-activity --watch

# Run tests with coverage
npx nx test eqt-activity --coverage
npx nx run-many -t test --configuration=ci  # CI mode with coverage
```

### Linting

```bash
# Lint all projects
npx nx run-many -t lint

# Lint a specific project
npx nx lint eqt-activity
npx nx lint trade-grid

# Auto-fix linting issues
npx nx lint eqt-activity --fix
```

### E2E Testing

```bash
# Run E2E tests (Cypress)
npx nx e2e eqt-activity-e2e

# Open Cypress UI
npx nx open-cypress eqt-activity-e2e

# Run E2E in CI mode
npx nx e2e-ci eqt-activity-e2e
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
npx nx show project eqt-activity

# List all projects
npx nx show projects

# View affected projects (based on git changes)
npx nx affected:graph
```

## Technology Stack

- **Framework**: Angular 20 (standalone components)
- **Language**: TypeScript 5.9
- **Build System**: Nx 21.6.5 with Angular CLI 20
- **Grid Component**: AG Grid Enterprise 34.2.0 + AG Grid Angular
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

## Recent Enhancements (Session Work)

### AG Grid Enterprise Integration & Feature Enhancements

This section documents significant enhancements made to the trade grid system, including AG Grid Enterprise features, UI improvements, and architectural refinements.

#### 1. AG Grid Enterprise Migration

**Overview**: Upgraded from AG Grid Community to Enterprise edition with proper license management.

**Key Changes:**
- **Package**: Installed `ag-grid-enterprise@34.2.0`
- **Module Registration**: Added `AllEnterpriseModule` alongside `AllCommunityModule`
- **License Management**: Created secure license handling system (`libs/shared/ui-components/src/lib/license/ag-grid-license.ts`)
- **Environment Integration**: License key stored in environment variables with development override support

**Enterprise Features Enabled:**
- Row Grouping & Aggregation
- Enhanced Context Menu
- Advanced Filtering
- Column Sidebar with tools panel
- Export functionality (Excel/CSV)

**License Setup:**
```typescript
// Automatic license setup in main.ts
import { setupAgGridLicense } from '@trade-platform/shared/ui-components';
await setupAgGridLicense({ forceInDevelopment: true });
```

#### 2. Data Aggregation with "Cancelled By" Column

**Feature**: Added comprehensive person data aggregation showing who cancelled trades.

**Implementation:**
- **Custom Cell Renderer**: `CancelledByCellComponent` with Material Design badges
- **Person Service Interface**: Standardized person data access pattern
- **Visual Design**: Color-coded initials with hover tooltips showing full names
- **Group Support**: Handles both individual rows and grouped data display
- **Fallback System**: Graceful handling of unknown persons with "Unknown (ID)" display

**Technical Details:**
```typescript
// Person initials with tooltip
<span [matTooltip]="person.fullName" class="cancelled-by-initials">
  {{ person.initials }}
</span>

// Group row detection and handling
if (this.params.node && this.params.node.group) {
  // Extract initials from group key
  const initials = groupKey.split(' ').map(part => part.charAt(0)).join('');
}
```

#### 3. Material UI Integration

**Enhancement**: Integrated Angular Material components for professional UI experience.

**Components Added:**
- **Tooltips**: `MatTooltipModule` for enhanced user guidance
- **Buttons**: `MatButtonModule` for consistent button styling
- **Badges**: `MatBadgeModule` for count indicators
- **Icons**: `MatIconModule` for visual clarity

**Benefits:**
- Consistent Material Design language
- Better accessibility with proper ARIA support
- Professional appearance matching modern web standards
- Enhanced user experience with interactive feedback

#### 4. Advanced Theme System

**Feature**: Comprehensive theme management with dark, light, and high-contrast options.

**Theme Configuration** (`libs/shared/ui-components/src/lib/themes/ag-grid-themes.ts`):

```typescript
// Three professionally designed themes
export const AVAILABLE_THEMES: ThemeConfig[] = [
  {
    name: 'dark',
    theme: tradePlatformDarkTheme,
    description: 'Dark theme optimized for trading environments'
  },
  {
    name: 'light', 
    theme: tradePlatformLightTheme,
    description: 'Light theme for day trading and bright environments'
  },
  {
    name: 'high-contrast',
    theme: tradePlatformHighContrastTheme,
    description: 'High contrast theme for maximum readability'
  }
];
```

**Theme Features:**
- **Dynamic Switching**: Real-time theme changes without page reload
- **Accessibility**: High contrast options for better readability
- **Trading Optimized**: Color schemes designed for financial data display
- **Header Enhancement**: Improved readability with proper contrast ratios

#### 5. Theme-Aware Column Styling

**Problem Solved**: Fixed text visibility issues in light theme where cell text was too light.

**Solution**: Implemented comprehensive theme-aware color system:

```typescript
// Theme-aware color variables in column configuration
const buyColor = isDarkTheme ? '#4ade80' : '#16a34a';
const sellColor = isDarkTheme ? '#f87171' : '#dc2626';
const defaultColor = isDarkTheme ? '#e5e7eb' : '#0f172a';

// Applied to all cells for proper contrast
const baseCellStyle = { color: defaultColor };
```

**Color Specifications:**
| Element | Dark Theme | Light Theme |
|---------|------------|-------------|
| Default Text | `#e5e7eb` (light gray) | `#0f172a` (very dark gray) |
| Buy/Filled | `#4ade80` (bright green) | `#16a34a` (dark green) |
| Sell | `#f87171` (bright red) | `#dc2626` (dark red) |
| Status Colors | Bright variants | Dark variants for contrast |

#### 6. Architectural Improvements

**Column Configuration Decoupling**: Separated column definitions into dedicated configuration file following monorepo best practices.

**Structure** (`libs/trade-grid/src/lib/config/trade-grid-columns.config.ts`):
```typescript
export class TradeGridColumnsConfig {
  static createColumnDefinitions(personService: PersonService, isDarkTheme = true): ColDef[] {
    // Centralized column configuration with theme support
  }
  
  static createDefaultColDef(isDarkTheme = true): ColDef {
    // Theme-aware default column settings
  }
  
  static createDefaultPersonService(): PersonService {
    // Fallback person service with mock data
  }
}
```

**Benefits:**
- **Separation of Concerns**: Component logic separated from configuration
- **Reusability**: Configuration can be used across multiple components
- **Maintainability**: Centralized column management
- **Testability**: Easier to unit test configuration logic

#### 7. Enterprise Row Grouping Features

**Implementation**: Comprehensive row grouping with aggregation support.

**Features:**
- **Drag & Drop Grouping**: Users can drag columns to group panel
- **Multiple Group Levels**: Support for nested grouping
- **Aggregation Functions**: Sum, count, average for numeric columns
- **Collapsed by Default**: Groups start collapsed for better overview
- **Group Row Styling**: Special handling for group headers and values

**Configuration:**
```typescript
gridOptions: GridOptions = {
  rowGroupPanelShow: 'always',
  groupDefaultExpanded: 0, // Collapsed by default
  suppressAggFuncInHeader: false,
  enableRowGroup: true,
  // Column-specific grouping in column definitions
}
```

#### 8. Enterprise Context Menu Integration

**Migration**: Replaced custom context menu with AG Grid's enterprise context menu system.

**Removed Custom Implementation:**
- ❌ Custom HTML context menu template (30+ lines)
- ❌ Custom CSS styling (50+ lines)
- ❌ Custom event handling methods
- ❌ Material menu module dependencies

**New Enterprise Implementation:**
```typescript
getContextMenuItems() {
  const selectedActiveTrades = this.getSelectedActiveTrades();
  
  return [
    {
      name: `Cancel Selected (${selectedActiveTrades.length})`,
      disabled: selectedActiveTrades.length === 0,
      action: () => this.onCancelSelected()
    },
    'separator',
    'copy',
    'copyWithHeaders', 
    'export'
  ];
}
```

**Benefits:**
- **Native Integration**: Uses AG Grid's built-in context menu system
- **Professional Appearance**: Consistent with AG Grid's design language
- **Better Accessibility**: Proper ARIA support and keyboard navigation
- **Reduced Code**: Eliminated ~100 lines of custom implementation
- **Enhanced Functionality**: Includes standard AG Grid operations (copy, export)

#### 9. Enhanced User Experience Features

**Multi-Selection with Smart Actions:**
- **Bulk Operations**: Cancel multiple trades simultaneously
- **Visual Feedback**: Real-time count of selected items
- **Smart Disabling**: Actions disabled when no valid selections
- **Keyboard Support**: Full keyboard navigation support

**Professional UI Enhancements:**
- **Loading States**: Proper loading indicators during operations
- **Error Handling**: Graceful error handling with user feedback
- **Tooltips**: Contextual help throughout the interface
- **Animations**: Smooth transitions and micro-interactions

#### 10. Performance & Optimization

**Grid Performance:**
- **Virtual Scrolling**: Efficient rendering of large datasets
- **Animation Optimization**: Smooth row animations without performance impact
- **Memory Management**: Proper cleanup of subscriptions and listeners
- **Pagination**: Smart pagination with 50 rows per page default

**Code Organization:**
- **Tree Shaking**: Optimized imports for minimal bundle size
- **Type Safety**: Comprehensive TypeScript interfaces
- **Error Boundaries**: Robust error handling throughout

### Development Guidelines for Enhanced Features

#### Working with Enterprise Features

1. **License Requirements**: Ensure AG Grid Enterprise license is properly configured
2. **Module Registration**: Both Community and Enterprise modules must be registered
3. **Environment Setup**: License key in environment variables for production

#### Theme Development

1. **Color Consistency**: Use theme service for all color decisions
2. **Contrast Ratios**: Ensure WCAG compliance for accessibility
3. **Dynamic Updates**: All components should respond to theme changes

#### Column Configuration

1. **Centralized Management**: Use `TradeGridColumnsConfig` for all column definitions
2. **Theme Awareness**: Pass `isDarkTheme` parameter for proper styling
3. **Type Safety**: Use `ColDef<TradeData>` for typed column definitions

#### Context Menu Customization

1. **Enterprise Integration**: Use AG Grid's context menu system
2. **Business Logic**: Integrate existing business logic with menu actions
3. **Accessibility**: Ensure keyboard and screen reader support

### Testing Considerations

**Unit Testing:**
- Test theme switching functionality
- Verify column configuration with different themes
- Test context menu action execution

**Integration Testing:**
- Verify enterprise license integration
- Test grouping and aggregation features
- Validate theme consistency across components

**E2E Testing:**
- Test complete user workflows with enterprise features
- Verify accessibility compliance
- Test performance with large datasets

### Future Enhancements

**Potential Additions:**
- Advanced filtering with filter sets
- Custom aggregation functions
- Excel-style pivoting
- Real-time data streaming integration
- Advanced charting with AG Grid Charts
- Custom cell editors for inline editing

This comprehensive enhancement has transformed the basic AG Grid implementation into a professional, enterprise-grade trading grid with modern UI patterns and robust functionality.

### Application Renaming (October 2025)

**Application Name Change**: The main application was renamed from "shell" to "eqt-activity" to better reflect its purpose as an EQT Activity trading platform.

**Changes Made:**
- **Application**: `apps/shell` → `apps/eqt-activity`
- **E2E Tests**: `apps/shell-e2e` → `apps/eqt-activity-e2e`
- **Title**: Updated HTML title to "EQT Activity Platform"
- **Component**: Updated app title to "EQT Activity Platform"
- **Documentation**: Updated all commands and references in documentation

**Commands Updated:**
```bash
# Old commands
npx nx serve shell
npx nx build shell
npx nx test shell

# New commands  
npx nx serve eqt-activity
npx nx build eqt-activity
npx nx test eqt-activity
```

**Note**: The feature library structure remains unchanged (`@trade-platform/shell/feature`) as it represents the shell pattern for organizing features, not the application name.

### Infinite Scroll Implementation (October 2025)

**Performance Enhancement**: Replaced pagination with infinite scroll for better user experience and performance with large datasets.

**Changes Made:**
- **Row Model**: Changed from client-side to infinite scroll row model
- **Datasource**: Implemented custom IDatasource for server-side data simulation
- **Caching**: Added intelligent caching with configurable block sizes
- **Sorting**: Maintained sorting functionality with infinite scroll
- **Performance**: Optimized for large datasets with virtual scrolling

**Configuration:**
```typescript
// Infinite scroll settings
[rowModelType]="'infinite'"
[cacheBlockSize]="50"           // Rows per block
[cacheOverflowSize]="2"         // Extra blocks cached
[maxConcurrentDatasourceRequests]="2"
[infiniteInitialRowCount]="100" // Initial loading indicator
[maxBlocksInCache]="10"         // Memory management
```

**Benefits:**
- **Better Performance**: Only renders visible rows
- **Smooth Scrolling**: No page breaks or loading delays
- **Memory Efficient**: Intelligent caching and cleanup
- **Large Dataset Support**: Handles thousands of rows smoothly
- **Maintained Functionality**: All existing features (grouping, sorting, filtering) work seamlessly

**Technical Implementation:**
- Custom datasource with simulated server-side data fetching
- Intelligent sorting implementation for all TradeData fields
- Automatic data refresh on changes with `refreshInfiniteCache()`
- Optimized rendering with 100ms simulated network delay

````
