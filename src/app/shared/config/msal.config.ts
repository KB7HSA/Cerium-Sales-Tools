import { 
  BrowserCacheLocation, 
  IPublicClientApplication, 
  InteractionType,
  LogLevel, 
  PublicClientApplication 
} from '@azure/msal-browser';
import { MsalGuardConfiguration, MsalInterceptorConfiguration } from '@azure/msal-angular';

/**
 * IMPORTANT: Update these values with your Azure AD app registration details
 * 
 * To get these values:
 * 1. Go to Azure Portal (https://portal.azure.com)
 * 2. Navigate to Azure Active Directory > App registrations
 * 3. Create a new registration or select existing one
 * 4. Copy the Application (client) ID and Directory (tenant) ID
 * 5. Add redirect URIs in Authentication section
 */

export const msalConfig = {
  auth: {
    clientId: '712b4eda-bfde-4a28-90d2-aa645d4c6977', // Replace with your Azure AD app client ID
    authority: 'https://login.microsoftonline.com/aec55451-6c83-4a80-ae9f-72e78ac152c5', // Replace with your tenant ID or use 'common' for multi-tenant
    redirectUri: 'http://localhost:4200', // Update for production
    postLogoutRedirectUri: 'http://localhost:4200'
  },
  cache: {
    cacheLocation: BrowserCacheLocation.LocalStorage, // Use localStorage for persistent sessions
    storeAuthStateInCookie: false, // Set to true for IE11/Edge
  },
  system: {
    loggerOptions: {
      loggerCallback: (logLevel: LogLevel, message: string) => {
        if (logLevel === LogLevel.Error) {
          console.error(message);
        } else if (logLevel === LogLevel.Warning) {
          console.warn(message);
        } else if (logLevel === LogLevel.Info) {
          console.info(message);
        }
      },
      logLevel: LogLevel.Info,
      piiLoggingEnabled: false
    }
  }
};

/**
 * Scopes for initial authentication
 */
export const loginRequest = {
  scopes: ['User.Read', 'openid', 'profile', 'email']
};

/**
 * Scopes for accessing Microsoft Graph API
 */
export const graphScopes = {
  scopes: ['User.Read', 'User.ReadBasic.All']
};

/**
 * MSAL Guard configuration
 */
export function MSALGuardConfigFactory(): MsalGuardConfiguration {
  return {
    interactionType: InteractionType.Redirect,
    authRequest: loginRequest,
    loginFailedRoute: '/sign-in'
  };
}

/**
 * MSAL Interceptor configuration
 */
export function MSALInterceptorConfigFactory(): MsalInterceptorConfiguration {
  const protectedResourceMap = new Map<string, Array<string>>();
  
  // Protect Microsoft Graph API calls
  protectedResourceMap.set('https://graph.microsoft.com/v1.0/me', ['User.Read']);
  protectedResourceMap.set('https://graph.microsoft.com/v1.0/*', ['User.Read']);

  return {
    interactionType: InteractionType.Redirect,
    protectedResourceMap
  };
}

/**
 * MSAL Instance factory
 */
export function MSALInstanceFactory(): IPublicClientApplication {
  return new PublicClientApplication(msalConfig);
}
