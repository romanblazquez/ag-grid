// Environment configuration for development
export const environment = {
  production: false,
  // AG Grid license key - will be undefined in development (safe)
  agGridLicenseKey: undefined,
};

// Make environment available globally for the license utility
if (typeof window !== 'undefined') {
  (window as { environment?: typeof environment }).environment = environment;
}
