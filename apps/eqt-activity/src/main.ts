import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Import and register AG Grid modules first
import { ModuleRegistry } from 'ag-grid-community';
import { AllEnterpriseModule } from 'ag-grid-enterprise';

// Register Enterprise modules first
ModuleRegistry.registerModules([AllEnterpriseModule]);

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
