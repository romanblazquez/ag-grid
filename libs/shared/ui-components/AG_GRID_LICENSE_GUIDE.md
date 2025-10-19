# AG Grid Enterprise License Management Guide

## 🛡️ **Secure License Key Handling**

This implementation provides enterprise-grade license key management for AG Grid Enterprise with the following security features:

- ✅ **Never hardcode license keys** in source code
- ✅ **Development-friendly** - runs without license in dev mode
- ✅ **Production-ready** - automatically injects license from environment
- ✅ **Framework-agnostic** - works with Angular, React, Vue, Vite
- ✅ **Fail-safe** - graceful degradation to Community mode

## 🔧 **Setup Instructions**

### 1. **Environment Variables Setup**

#### For Angular Applications:
```bash
# Production environment variable
export NG_APP_AG_GRID_LICENSE_KEY="your_license_key_here"
```

#### For Vite/React Applications:
```bash
# Production environment variable
export VITE_AG_GRID_LICENSE_KEY="your_license_key_here"
```

#### For Node.js/NestJS Applications:
```bash
# Production environment variable
export AG_GRID_LICENSE_KEY="your_license_key_here"
```

### 2. **Application Integration**

#### Angular Integration:
```typescript
// main.ts
import { setupAgGridLicense } from '@trade-platform/shared/ui-components';

// Setup license before bootstrapping
setupAgGridLicense().then(() => {
  bootstrapApplication(App, appConfig);
});
```

#### React Integration:
```typescript
// index.tsx or App.tsx
import { setupAgGridLicense } from '@/utils/ag-grid-license';

setupAgGridLicense();
```

#### Basic Usage:
```typescript
import { setupAgGridLicense, isAgGridEnterpriseAvailable } from '@trade-platform/shared/ui-components';

// Basic setup
await setupAgGridLicense();

// With options
await setupAgGridLicense({
  forceInDevelopment: false,  // Run without license in dev
  silent: false,              // Show console messages
});

// Check enterprise availability
const hasEnterprise = await isAgGridEnterpriseAvailable();
```

## 🔒 **Security Features**

### **Development Mode (Safe)**
- ✅ Runs **without license key** on localhost
- ✅ Shows warning messages (not errors)
- ✅ Safe for development and testing
- ✅ No license key required in dev environment

### **Production Mode (Secured)**
- ✅ **Requires license key** from environment variables
- ✅ **Fails fast** if license key missing
- ✅ Supports multiple environment variable patterns
- ✅ Never exposes license keys in source code

### **Dynamic Import Safety**
```typescript
// Safe import that won't break Community builds
async function importLicenseManager() {
  try {
    const moduleName = 'ag-grid-enterprise';
    const agGridEnterprise = await (new Function('return import("' + moduleName + '")')());
    return agGridEnterprise.LicenseManager;
  } catch {
    return null; // Enterprise not available - safe fallback
  }
}
```

## 🎯 **Environment Configuration**

### **Development (environment.ts)**
```typescript
export const environment = {
  production: false,
  agGridLicenseKey: undefined // Safe - no license required
};
```

### **Production (environment.prod.ts)**
```typescript
export const environment = {
  production: true,
  agGridLicenseKey: process.env['NG_APP_AG_GRID_LICENSE_KEY']
};
```

## 🚀 **Advanced Features**

### **Conditional Enterprise Features**
```typescript
import { withEnterpriseFeatures } from '@trade-platform/shared/ui-components';

// Use enterprise features only when available
const columnDefs = await withEnterpriseFeatures(
  [
    { field: 'name', enableRowGroup: true }, // Enterprise
    { field: 'value', aggFunc: 'sum' }       // Enterprise
  ],
  [
    { field: 'name' },  // Community fallback
    { field: 'value' }  // Community fallback
  ]
);
```

### **Enterprise Detection**
```typescript
import { isAgGridEnterpriseAvailable } from '@trade-platform/shared/ui-components';

if (await isAgGridEnterpriseAvailable()) {
  // Show enterprise features in UI
  showAdvancedFilters = true;
  showGrouping = true;
} else {
  // Hide enterprise-only features
  showAdvancedFilters = false;
  showGrouping = false;
}
```

## 📦 **Build Configuration**

### **Angular (angular.json)**
```json
{
  "build": {
    "configurations": {
      "production": {
        "fileReplacements": [
          {
            "replace": "src/environments/environment.ts",
            "with": "src/environments/environment.prod.ts"
          }
        ]
      }
    }
  }
}
```

### **Vite (vite.config.ts)**
```typescript
export default defineConfig({
  define: {
    'process.env.VITE_AG_GRID_LICENSE_KEY': JSON.stringify(
      process.env.VITE_AG_GRID_LICENSE_KEY
    )
  }
});
```

## 🔍 **Troubleshooting**

### **Common Issues & Solutions**

#### 1. **"License key missing" in production**
```bash
# Ensure environment variable is set
echo $NG_APP_AG_GRID_LICENSE_KEY

# For CI/CD, add to environment:
NG_APP_AG_GRID_LICENSE_KEY=your_license_key
```

#### 2. **Enterprise features not working**
```typescript
// Check if enterprise is detected
const hasEnterprise = await isAgGridEnterpriseAvailable();
console.log('Enterprise available:', hasEnterprise);
```

#### 3. **Build errors with Community version**
```typescript
// The dynamic import prevents bundling issues
// No need to install ag-grid-enterprise for Community builds
```

### **Console Messages**

#### Development Mode:
```
ℹ️ AG Grid Enterprise detected in development mode
⚠️ Running without license key (expect console warnings)
```

#### Production Mode (Success):
```
✅ AG Grid Enterprise license activated successfully
```

#### Production Mode (Error):
```
❌ AG Grid Enterprise license key missing in production build
```

## 📋 **Deployment Checklist**

### **Before Production Deployment:**

- [ ] Set environment variable: `NG_APP_AG_GRID_LICENSE_KEY`
- [ ] Verify license key is not in source code
- [ ] Test enterprise features work in production build
- [ ] Confirm console shows "license activated successfully"
- [ ] Verify builds work without ag-grid-enterprise package

### **CI/CD Environment:**
```yaml
# GitHub Actions example
env:
  NG_APP_AG_GRID_LICENSE_KEY: ${{ secrets.AG_GRID_LICENSE_KEY }}

# Docker example
ENV NG_APP_AG_GRID_LICENSE_KEY=${AG_GRID_LICENSE_KEY}
```

## 🎨 **Framework Examples**

### **Angular Monorepo**
```typescript
// libs/shared/ui-components/src/lib/utils/ag-grid-license.ts
export { setupAgGridLicense } from './ag-grid-license';

// apps/trading-app/src/main.ts
import { setupAgGridLicense } from '@myorg/shared/ui-components';
await setupAgGridLicense();
```

### **NX Monorepo**
```typescript
// libs/shared/utils/src/lib/ag-grid-license.ts
export { setupAgGridLicense } from './ag-grid-license';

// apps/dashboard/src/main.ts
import { setupAgGridLicense } from '@myorg/shared/utils';
await setupAgGridLicense();
```

This implementation ensures your AG Grid Enterprise license is handled securely across all environments while maintaining developer productivity! 🚀