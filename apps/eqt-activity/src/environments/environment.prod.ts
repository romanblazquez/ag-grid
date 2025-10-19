// Environment configuration for production
export const environment = {
  production: true,
  // AG Grid license key from environment variable
  // Set NG_APP_AG_GRID_LICENSE_KEY in your production environment
  agGridLicenseKey: (
    globalThis as { process?: { env?: Record<string, string> } }
  ).process?.env?.['NG_APP_AG_GRID_LICENSE_KEY'],
};

// Make environment available globally for the license utility
if (typeof window !== 'undefined') {
  (window as { environment?: typeof environment }).environment = environment;
}
