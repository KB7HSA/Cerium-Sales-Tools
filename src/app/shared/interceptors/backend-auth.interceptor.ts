import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MsalService } from '@azure/msal-angular';
import { environment } from '../../../environments/environment';

/**
 * Custom HTTP interceptor that attaches the Azure AD ID token to backend API calls.
 *
 * Why not use MSAL's built-in MsalInterceptor for the backend?
 * - MsalInterceptor uses protectedResourceMap with access_token scopes.
 * - The `{clientId}/.default` scope requires "Expose an API" configured in
 *   Azure AD portal, which adds deployment friction.
 * - Instead, we attach the ID token directly. The ID token's `aud` claim
 *   matches the clientId, which is exactly what the backend JWT middleware validates.
 *
 * The MSAL MsalInterceptor is still used for Microsoft Graph API calls.
 */
@Injectable()
export class BackendAuthInterceptor implements HttpInterceptor {
  private readonly backendApiUrl: string;

  constructor(private msalService: MsalService) {
    this.backendApiUrl = environment.apiUrl || 'http://localhost:3000/api';
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Only attach token to backend API requests
    if (!req.url.startsWith(this.backendApiUrl)) {
      return next.handle(req);
    }

    // Skip token for public endpoints
    if (req.url.includes('/auth/microsoft/sync') || req.url.endsWith('/health')) {
      return next.handle(req);
    }

    const account = this.msalService.instance.getActiveAccount();
    if (!account) {
      // No active account — let the request go through without a token.
      // The backend will return 401 and the frontend guard will redirect to signin.
      return next.handle(req);
    }

    const idToken = account.idToken;
    if (!idToken) {
      return next.handle(req);
    }

    // Clone the request and attach the ID token as a Bearer token
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${idToken}`
      }
    });

    return next.handle(authReq);
  }
}
