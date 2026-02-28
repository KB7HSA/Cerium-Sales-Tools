import { 
  BrowserCacheLocation, 
  IPublicClientApplication, 
  InteractionType,
  LogLevel, 
  PublicClientApplication 
} from '@azure/msal-browser';
import { MsalGuardConfiguration, MsalInterceptorConfiguration } from '@azure/msal-angular';
import { environment } from '../../../environments/environment';

/**
 * MSAL Configuration
 * 
 * Azure AD credentials are loaded from environment files:
 *   - Development: src/environments/environment.ts
 *   - Production:  src/environments/environment.prod.ts
 */

export const msalConfig = {
  auth: {
    clientId: environment.azureAd.clientId,
    authority: `https://login.microsoftonline.com/${environment.azureAd.tenantId}`,
    redirectUri: environment.azureAd.redirectUri,
    postLogoutRedirectUri: environment.azureAd.redirectUri
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
    loginFailedRoute: '/signin'
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
  
  // NOTE: Backend API auth is handled by a separate BackendAuthInterceptor
  // that attaches the ID token. Do NOT add localhost:3000 here — the
  // {clientId}/.default scope requires "Expose an API" in Azure AD portal
  // which may not be configured.

  return {
    interactionType: InteractionType.Redirect,
    protectedResourceMap
  };
}

/**
 * MSAL Instance factory
 * 
 * Creates the MSAL PublicClientApplication instance.
 * MSAL Browser v5+ requires initialize() before the instance can be used.
 * Initialization is handled by MsalService.initialize() — do NOT call
 * initialize() here (fire-and-forget causes race conditions with guards
 * and interceptors that access the instance before it's ready).
 */
export function MSALInstanceFactory(): IPublicClientApplication {
  return new PublicClientApplication(msalConfig);
}
