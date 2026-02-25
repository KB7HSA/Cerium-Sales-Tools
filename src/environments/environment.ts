/**
 * Development Environment Configuration
 * This file is included when building with `ng build` for development
 */

export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  apiTimeout: 30000, // 30 seconds
  
  // Azure AD / MSAL Configuration
  azureAd: {
    clientId: '712b4eda-bfde-4a28-90d2-aa645d4c6977',
    tenantId: 'aec55451-6c83-4a80-ae9f-72e78ac152c5',
    redirectUri: 'http://localhost:4200',
  },
};
