# AG Grid Custom Theme Implementation

## 🎨 Overview

This implementation provides a structured approach to AG Grid theming following best practices for Angular monorepo architecture. The theme system includes both dark and light themes based on your custom requirements.

## 📁 File Structure

```
libs/shared/ui-components/
├── src/lib/themes/
│   ├── ag-grid-themes.ts      # Theme definitions and service
│   └── index.ts               # Theme exports
├── src/lib/theme-switcher/
│   ├── theme-switcher.component.ts  # Theme selection UI
│   └── index.ts               # Component exports
└── src/index.ts               # Main library exports
```

## 🎯 **Dark Theme Implementation**

### Your Custom Theme Configuration
```typescript
export const tradePlatformDarkTheme = themeQuartz.withParams({
  backgroundColor: '#1f2836',
  browserColorScheme: 'dark',
  chromeBackgroundColor: {
    ref: 'foregroundColor',
    mix: 0.07,
    onto: 'backgroundColor'
  },
  foregroundColor: '#FFF',
  headerFontSize: 14,
  
  // Enhanced properties for professional appearance
  headerBackgroundColor: '#2d3748',
  oddRowBackgroundColor: '#1a202c',
  rowHoverColor: '#2d3748',
  selectedRowBackgroundColor: '#4a5568',
  borderColor: '#4a5568',
  
  // Typography
  fontFamily: 'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontSize: 13,
  headerFontWeight: 600,
  
  // Spacing
  cellHorizontalPadding: 12,
  headerHeight: 40,
  rowHeight: 36,
  
  // Interactive elements
  accentColor: '#6366f1',
  checkboxCheckedShapeColor: '#6366f1',
  checkboxUncheckedBackgroundColor: '#718096',
});
```

## 🌟 **Key Features**

### 1. **Theme Service**
```typescript
export class ThemeService {
  static getCurrentTheme(): ThemeConfig
  static setTheme(themeName: string): ThemeConfig
  static getThemeByName(themeName: string): ThemeConfig | undefined
  static getAllThemes(): ThemeConfig[]
}
```

### 2. **Theme Switcher Component**
```typescript
<lib-theme-switcher 
  [selectedTheme]="currentTheme"
  (themeChanged)="onThemeChanged($event)"
></lib-theme-switcher>
```

### 3. **Grid Integration**
```typescript
<lib-trade-grid
  [rowData]="tradeData"
  [themeName]="currentTheme"
  [personService]="personService"
  (cancelTrade)="onCancelTrade($event)"
></lib-trade-grid>
```

## 🔧 **Implementation Details**

### Component Usage
```typescript
import { ThemeService, DEFAULT_THEME } from '@trade-platform/shared/ui-components';

@Component({
  // ... component config
})
export class TradeGrid {
  @Input() themeName?: string = 'dark';
  theme = DEFAULT_THEME;
  
  ngOnInit(): void {
    this.updateTheme();
  }
  
  private updateTheme(): void {
    if (this.themeName) {
      const themeConfig = ThemeService.getThemeByName(this.themeName);
      if (themeConfig) {
        this.theme = themeConfig.theme;
      }
    }
  }
}
```

### Template Integration
```html
<ag-grid-angular
  [theme]="theme"
  [rowData]="rowData"
  [columnDefs]="columnDefs"
  <!-- other grid properties -->
></ag-grid-angular>
```

## 🎨 **Available Themes**

### Dark Theme
- **Background**: `#1f2836` (Dark slate)
- **Foreground**: `#FFF` (White text)
- **Accent**: `#6366f1` (Indigo)
- **Use Case**: Trading floors, low-light environments

### Light Theme
- **Background**: `#ffffff` (White)
- **Foreground**: `#2d3748` (Dark text)
- **Accent**: `#6366f1` (Indigo)
- **Use Case**: Office environments, day trading

## 🚀 **Usage Examples**

### Basic Implementation
```typescript
// Shell Feature Component
export class ShellFeature {
  currentTheme = 'dark';
  
  onThemeChanged(themeName: string): void {
    this.currentTheme = themeName;
  }
}
```

### Template with Theme Switcher
```html
<div class="shell-feature-container">
  <header class="feature-header">
    <div class="header-content">
      <div class="title-section">
        <h1>Trade Platform</h1>
        <p class="subtitle">Real-time trading dashboard</p>
      </div>
      <div class="controls-section">
        <lib-theme-switcher 
          [selectedTheme]="currentTheme"
          (themeChanged)="onThemeChanged($event)"
        ></lib-theme-switcher>
      </div>
    </div>
  </header>
  
  <section class="trade-section">
    <lib-trade-grid
      [themeName]="currentTheme"
      [rowData]="tradeData"
    ></lib-trade-grid>
  </section>
</div>
```

## 📦 **Dependencies**

- `ag-grid-community` ^34.2.0
- `@angular/material` ^20.3.0
- `@angular/cdk` ^20.3.0

## 🎯 **Best Practices Implemented**

### 1. **Monorepo Structure**
- ✅ Shared theme library in `libs/shared/ui-components`
- ✅ Centralized theme management
- ✅ Reusable across multiple apps

### 2. **Type Safety**
- ✅ Full TypeScript support
- ✅ Theme configuration interfaces
- ✅ Compile-time validation

### 3. **Extensibility**
- ✅ Easy to add new themes
- ✅ Theme service pattern
- ✅ Component-based theme switching

### 4. **Performance**
- ✅ Tree-shakable imports
- ✅ Lazy loading capabilities
- ✅ Minimal runtime overhead

### 5. **User Experience**
- ✅ Smooth theme transitions
- ✅ Persistent theme selection
- ✅ Intuitive theme switcher UI

## 🔄 **Adding New Themes**

```typescript
// Add to AVAILABLE_THEMES array
{
  name: 'high-contrast',
  theme: themeQuartz.withParams({
    backgroundColor: '#000000',
    foregroundColor: '#FFFF00',
    // ... other parameters
  }),
  description: 'High contrast theme for accessibility'
}
```

## 🎨 **Material Integration**

The theme system integrates seamlessly with Angular Material:
- Material Design color palette
- Consistent typography (Roboto font)
- Responsive form controls
- Professional select dropdown for theme switching

This implementation provides a solid foundation for theme management that can scale across your entire monorepo while maintaining consistency and performance.