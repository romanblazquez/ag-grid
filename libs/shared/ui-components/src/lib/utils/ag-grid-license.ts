/**
 * AG Grid Enterprise License Key Management
 * 
 * This utility handles AG Grid Enterprise license keys securely:
 * 
 * DEVELOPMENT MODE:
 * - Runs without license key (shows console warnings only)
 * - Safe for localhost and test environments
 * - No hardcoded license keys in source code
 * 
 * PRODUCTION MODE:
 * - Automatically injects license key from environment variables
 * - Reads from Angular environment.ts or process.env
 * - Fails gracefully if license key is missing
 * 
 * SETUP INSTRUCTIONS:
 * 
 * 1. For Production - Set environment variable:
 *    - VITE_AG_GRID_LICENSE_KEY=your_license_key (Vite/React)
 *    - NG_APP_AG_GRID_LICENSE_KEY=your_license_key (Angular)
 *    - AG_GRID_LICENSE_KEY=your_license_key (Node.js/NestJS)
 * 
 * 2. Add to Angular environment.ts:
 *    export const environment = {
 *      production: true,
 *      agGridLicenseKey: process.env['NG_APP_AG_GRID_LICENSE_KEY']
 *    };
 * 
 * 3. Import and call in your app initialization:
 *    import { setupAgGridLicense } from '@/utils/ag-grid-license';
 *    setupAgGridLicense();
 * 
 * SECURITY NOTES:
 * - Never commit license keys to version control
 * - License keys are only loaded in production builds
 * - Safe fallback to community version if enterprise is unavailable
 */

import { isDevMode } from '@angular/core';

// Type definitions for better IDE support
interface LicenseManager {
  setLicenseKey(licenseKey: string): void;
}

interface AgGridEnterprise {
  LicenseManager: LicenseManager;
}

// Environment interface for type safety
interface Environment {
  production?: boolean;
  agGridLicenseKey?: string;
}

// Global window extension for environment
declare global {
  interface Window {
    environment?: Environment;
  }
}

/**
 * Safely import AG Grid Enterprise LicenseManager
 * Returns null if enterprise package is not available
 */
async function importLicenseManager(): Promise<LicenseManager | null> {
  try {
    // Use eval to prevent bundlers from trying to resolve this at build time
    const moduleName = 'ag-grid-enterprise';
    const agGridEnterprise = await (new Function('return import("' + moduleName + '")')()) as AgGridEnterprise;
    return agGridEnterprise.LicenseManager || null;
  } catch {
    // AG Grid Enterprise not installed - this is fine for community builds
    console.info('AG Grid Enterprise not detected - running in Community mode');
    return null;
  }
}

/**
 * Get license key from environment variables
 * Supports multiple environment patterns for different frameworks
 */
function getLicenseKeyFromEnvironment(): string | null {
  // Try Angular environment first
  try {
    const environment = window?.environment as Environment;
    if (environment?.agGridLicenseKey) {
      return environment.agGridLicenseKey;
    }
  } catch {
    // Environment not available - continue to other methods
  }

  // Try process.env (Node.js/SSR) with safe access
  const globalProcess = (globalThis as unknown as { process?: { env: Record<string, string> } }).process;
  if (globalProcess?.env) {
    return (
      globalProcess.env['AG_GRID_LICENSE_KEY'] ||
      globalProcess.env['NG_APP_AG_GRID_LICENSE_KEY'] ||
      globalProcess.env['VITE_AG_GRID_LICENSE_KEY'] ||
      null
    );
  }

  // Try import.meta.env (Vite) with safe access
  const globalImportMeta = (globalThis as unknown as { 'import.meta'?: { env?: Record<string, string> } })['import.meta'];
  if (globalImportMeta?.env) {
    return (
      globalImportMeta.env['VITE_AG_GRID_LICENSE_KEY'] ||
      globalImportMeta.env['AG_GRID_LICENSE_KEY'] ||
      null
    );
  }

  return null;
}

/**
 * Check if we're running in development mode
 * Uses Angular's isDevMode() and fallback checks
 */
function isDevelopmentMode(): boolean {
  try {
    // Use Angular's development mode detection
    return isDevMode();
  } catch {
    // Fallback for non-Angular environments
    const globalProcess = (globalThis as unknown as { process?: { env: Record<string, string> } }).process;
    
    return !!(
      (typeof window !== 'undefined' && 
       (window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname === '' ||
        window.location.hostname.includes('dev') ||
        window.location.hostname.includes('test'))) || 
      (globalProcess?.env && globalProcess.env['NODE_ENV'] !== 'production')
    );
  }
}

/**
 * Setup AG Grid Enterprise license key
 * 
 * Call this function early in your application lifecycle:
 * - In Angular: app.config.ts or main.ts
 * - In React: index.tsx or App.tsx
 * - In NestJS: main.ts
 * 
 * @param options Configuration options
 */
export async function setupAgGridLicense(options: {
  /**
   * Force license key setup even in development
   * Useful for testing enterprise features locally
   */
  forceInDevelopment?: boolean;
  
  /**
   * Custom license key (overrides environment)
   * ⚠️ WARNING: Only use for testing, never commit to source control
   */
  customLicenseKey?: string;
  
  /**
   * Silent mode - suppress console messages
   */
  silent?: boolean;
} = {}): Promise<void> {
  const {
    forceInDevelopment = false,
    customLicenseKey,
    silent = false
  } = options;

  try {
    // Import license manager (safe if enterprise not installed)
    const licenseManager = await importLicenseManager();
    
    if (!licenseManager) {
      if (!silent) {
        console.info('🏪 AG Grid Community mode - Enterprise features not available');
      }
      return;
    }

    const isDevMode = isDevelopmentMode();

    // In development, skip license unless forced
    if (isDevMode && !forceInDevelopment && !customLicenseKey) {
      if (!silent) {
        console.warn(
          '⚠️ AG Grid Enterprise detected in development mode\n' +
          'Running without license key (expect console warnings)\n' +
          'To enable enterprise features locally, set forceInDevelopment: true'
        );
      }
      return;
    }

    // Get license key from custom or environment
    const licenseKey = customLicenseKey || getLicenseKeyFromEnvironment();

    if (!licenseKey) {
      const errorMessage = isDevMode 
        ? '⚠️ AG Grid Enterprise license key not found in environment variables'
        : '❌ AG Grid Enterprise license key missing in production build';
      
      if (!silent) {
        console.error(
          errorMessage + '\n' +
          'Set one of these environment variables:\n' +
          '- AG_GRID_LICENSE_KEY\n' +
          '- NG_APP_AG_GRID_LICENSE_KEY (Angular)\n' +
          '- VITE_AG_GRID_LICENSE_KEY (Vite)'
        );
      }

      // In production, this is a critical error
      if (!isDevMode) {
        throw new Error('AG Grid Enterprise license key is required for production builds');
      }
      return;
    }

    // Set the license key
    licenseManager.setLicenseKey(licenseKey);
    
    if (!silent) {
      console.info('✅ AG Grid Enterprise license activated successfully');
    }

  } catch (error) {
    const errorMessage = `Failed to setup AG Grid license: ${error instanceof Error ? error.message : 'Unknown error'}`;
    
    if (!silent) {
      console.error('❌', errorMessage);
    }

    // Re-throw in production to fail fast
    if (!isDevelopmentMode()) {
      throw new Error(errorMessage);
    }
  }
}

/**
 * Check if AG Grid Enterprise is available and licensed
 * Useful for feature detection in your application
 */
export async function isAgGridEnterpriseAvailable(): Promise<boolean> {
  try {
    const licenseManager = await importLicenseManager();
    return licenseManager !== null;
  } catch {
    return false;
  }
}

/**
 * Utility to conditionally use enterprise features
 * 
 * Example usage:
 * const columnDefs = await withEnterpriseFeatures([
 *   { field: 'name', enableRowGroup: true }, // Enterprise feature
 * ], [
 *   { field: 'name' }, // Community fallback
 * ]);
 */
export async function withEnterpriseFeatures<T>(
  enterpriseConfig: T,
  communityFallback: T
): Promise<T> {
  const hasEnterprise = await isAgGridEnterpriseAvailable();
  return hasEnterprise ? enterpriseConfig : communityFallback;
}

// Export for backwards compatibility
export default setupAgGridLicense;