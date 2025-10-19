# AG Grid License Integration Example

## 🎯 **Using License Management in Trade Grid**

Here's how the license management integrates with your trade grid:

### **1. Application Startup**

```typescript
// apps/shell/src/main.ts
import { setupAgGridLicense } from '@trade-platform/shared/ui-components';

// Setup AG Grid license before app starts
setupAgGridLicense({
  silent: false,              // Show status in console
  forceInDevelopment: false   // Allow dev without license
}).then(() => {
  bootstrapApplication(App, appConfig);
}).catch(error => {
  console.warn('AG Grid setup failed:', error);
  // Continue with Community version
  bootstrapApplication(App, appConfig);
});
```

### **2. Enterprise Feature Detection**

```typescript
// libs/trade-grid/src/lib/trade-grid.component.ts
import { isAgGridEnterpriseAvailable, withEnterpriseFeatures } from '@trade-platform/shared/ui-components';

export class TradeGrid implements OnInit {
  columnDefs: ColDef[] = [];
  hasEnterpriseFeatures = false;

  async ngOnInit(): Promise<void> {
    // Check if enterprise features are available
    this.hasEnterpriseFeatures = await isAgGridEnterpriseAvailable();
    
    // Configure columns based on available features
    this.columnDefs = await this.configureColumns();
  }

  private async configureColumns(): Promise<ColDef[]> {
    return withEnterpriseFeatures(
      // Enterprise configuration
      [
        {
          field: 'symbol',
          enableRowGroup: true,    // Enterprise feature
          enablePivot: true        // Enterprise feature
        },
        {
          field: 'trader',
          enableRowGroup: true,    // Enterprise feature
          aggFunc: 'count'         // Enterprise feature
        }
      ],
      // Community fallback
      [
        {
          field: 'symbol',
          sortable: true,
          filter: true
        },
        {
          field: 'trader',
          sortable: true,
          filter: true
        }
      ]
    );
  }
}
```

### **3. Environment Setup**

```typescript
// apps/shell/src/environments/environment.ts (Development)
export const environment = {
  production: false,
  agGridLicenseKey: undefined  // No license needed in dev
};

// apps/shell/src/environments/environment.prod.ts (Production)
export const environment = {
  production: true,
  agGridLicenseKey: process.env['NG_APP_AG_GRID_LICENSE_KEY']
};
```

### **4. Template Conditional Features**

```html
<!-- trade-grid.component.html -->
<ag-grid-angular
  [theme]="theme"
  [rowData]="rowData"
  [columnDefs]="columnDefs"
  [defaultColDef]="defaultColDef"
  
  <!-- Enterprise features (conditionally enabled) -->
  [enableRangeSelection]="hasEnterpriseFeatures"
  [enableCharts]="hasEnterpriseFeatures"
  [sideBar]="hasEnterpriseFeatures ? sideBarConfig : false"
  
  <!-- Always available features -->
  [pagination]="true"
  [animateRows]="true"
  (gridReady)="onGridReady($event)"
>
</ag-grid-angular>

<!-- Show enterprise status -->
<div class="grid-status" *ngIf="!hasEnterpriseFeatures">
  <small>Running in Community mode</small>
</div>
```

### **5. CSS Styling for Different Modes**

```css
/* trade-grid.component.css */
.grid-status {
  padding: 4px 8px;
  background: #f0f9ff;
  border: 1px solid #0ea5e9;
  border-radius: 4px;
  color: #0c4a6e;
  font-size: 12px;
  margin-top: 8px;
}

/* Enterprise-specific styling */
.ag-grid-enterprise .ag-header {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
}

/* Community-specific styling */
.ag-grid-community .ag-header {
  background: #f1f5f9;
}
```

### **6. Production Deployment**

```bash
# Set environment variable in your production environment
export NG_APP_AG_GRID_LICENSE_KEY="your_actual_license_key_here"

# Build for production
npm run build --configuration=production
```

### **7. Docker Deployment**

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .

# Build with license key from build args
ARG AG_GRID_LICENSE_KEY
ENV NG_APP_AG_GRID_LICENSE_KEY=${AG_GRID_LICENSE_KEY}

RUN npm install
RUN npm run build --configuration=production

EXPOSE 4200
CMD ["npm", "start"]
```

```bash
# Build Docker image with license key
docker build --build-arg AG_GRID_LICENSE_KEY="your_license_key" -t trading-app .
```

### **8. Development vs Production Behavior**

#### **Development Mode:**
```
🔧 Development detected
ℹ️ AG Grid Enterprise not licensed (Community mode)
⚠️ Some features may show console warnings
✅ Application continues normally
```

#### **Production Mode (Licensed):**
```
🚀 Production mode
✅ AG Grid Enterprise license activated
🎉 All enterprise features available
```

#### **Production Mode (No License):**
```
❌ Production mode
❌ AG Grid Enterprise license missing
🛑 Application startup blocked (fail-fast)
```

This implementation ensures your trading platform works seamlessly in all environments while maintaining security! 🎯