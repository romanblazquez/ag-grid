import { themeQuartz } from 'ag-grid-community';

/**
 * Custom AG Grid themes for the Trade Platform
 * Following AG Grid v33+ theming API best practices
 * Supports both Community and Enterprise features
 */

// Dark theme configuration
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
  
  // Enhanced header readability
  headerBackgroundColor: '#2d3748',
  headerTextColor: '#ffffff',
  
  // Row colors for better contrast
  oddRowBackgroundColor: '#1a202c',
  rowHoverColor: '#2d3748',
  selectedRowBackgroundColor: '#4a5568',
  borderColor: '#4a5568',
  cellTextColor: '#ffffff',
  
  // Font configurations for better readability
  fontFamily: 'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontSize: 13,
  headerFontWeight: 600,
  headerFontFamily: 'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  
  // Spacing for better header visibility
  cellHorizontalPadding: 12,
  headerHeight: 44,
  rowHeight: 36,
  
  // Colors for better contrast
  accentColor: '#6366f1',
  checkboxCheckedShapeColor: '#6366f1',
  checkboxUncheckedBackgroundColor: '#718096',
});

// Light theme configuration - properly configured for light mode
export const tradePlatformLightTheme = themeQuartz.withParams({
  backgroundColor: '#ffffff',
  browserColorScheme: 'light',
  chromeBackgroundColor: '#f8fafc',
  foregroundColor: '#1a202c',
  headerFontSize: 14,
  
  // Light theme specific colors with proper contrast
  headerBackgroundColor: '#f1f5f9',
  headerTextColor: '#0f172a',
  oddRowBackgroundColor: '#f8fafc',
  rowHoverColor: '#e2e8f0',
  selectedRowBackgroundColor: '#dbeafe',
  borderColor: '#cbd5e1',
  cellTextColor: '#1a202c',
  textColor: '#1a202c',
  
  // Font configurations
  fontFamily: 'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontSize: 13,
  headerFontWeight: 600,
  headerFontFamily: 'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  
  // Spacing
  cellHorizontalPadding: 12,
  headerHeight: 44,
  rowHeight: 36,
  
  // Light theme accent colors
  accentColor: '#2563eb',
  checkboxCheckedShapeColor: '#2563eb',
  checkboxUncheckedBackgroundColor: '#d1d5db',
});

// High contrast theme for maximum readability
export const tradePlatformHighContrastTheme = themeQuartz.withParams({
  backgroundColor: '#000000',
  browserColorScheme: 'dark',
  chromeBackgroundColor: '#1a1a1a',
  foregroundColor: '#FFFFFF',
  headerFontSize: 16,
  
  // High contrast header
  headerBackgroundColor: '#1a1a1a',
  headerTextColor: '#FFFFFF',
  
  // High contrast rows
  oddRowBackgroundColor: '#0a0a0a',
  rowHoverColor: '#333333',
  selectedRowBackgroundColor: '#444444',
  borderColor: '#666666',
  cellTextColor: '#FFFFFF',
  
  // Font configurations for accessibility
  fontFamily: 'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontSize: 14,
  headerFontWeight: 700,
  headerFontFamily: 'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  
  // Larger spacing for accessibility
  cellHorizontalPadding: 16,
  headerHeight: 48,
  rowHeight: 40,
  
  // High contrast colors
  accentColor: '#00FFFF',
  checkboxCheckedShapeColor: '#00FFFF',
  checkboxUncheckedBackgroundColor: '#666666',
});

// Theme configuration type for consistency
export interface ThemeConfig {
  name: string;
  theme: ReturnType<typeof themeQuartz.withParams>;
  description: string;
}

// Available themes registry
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

// Default theme
export const DEFAULT_THEME = tradePlatformDarkTheme;

// Theme utility functions
export class ThemeService {
  private static currentTheme: ThemeConfig = AVAILABLE_THEMES[0];

  static getCurrentTheme(): ThemeConfig {
    return this.currentTheme;
  }

  static setTheme(themeName: string): ThemeConfig {
    const theme = AVAILABLE_THEMES.find(t => t.name === themeName);
    if (theme) {
      this.currentTheme = theme;
      return theme;
    }
    console.warn(`Theme '${themeName}' not found. Using default theme.`);
    return this.currentTheme;
  }

  static getThemeByName(themeName: string): ThemeConfig | undefined {
    return AVAILABLE_THEMES.find(t => t.name === themeName);
  }

  static getAllThemes(): ThemeConfig[] {
    return [...AVAILABLE_THEMES];
  }
}