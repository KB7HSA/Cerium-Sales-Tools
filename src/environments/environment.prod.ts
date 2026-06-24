/**
 * Production Environment Configuration
 * This file is included when building with `ng build --configuration production`
 * Docker builds overwrite this file via deploy/write-frontend-env.mjs
 */

export const environment = {
  production: true,
  apiUrl: '/api',
  apiTimeout: 30000, // 30 seconds
  
  // Azure AD / MSAL Configuration
  // IMPORTANT: Update redirectUri to your production domain
  azureAd: {
    clientId: '712b4eda-bfde-4a28-90d2-aa645d4c6977',
    tenantId: 'aec55451-6c83-4a80-ae9f-72e78ac152c5',
    redirectUri: 'https://your-production-domain.com',
  },
};
