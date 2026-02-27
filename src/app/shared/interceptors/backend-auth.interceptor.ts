import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable, from, switchMap, catchError, of } from 'rxjs';
import { MsalService } from '@azure/msal-angular';
import { environment } from '../../../environments/environment';

/**
 * Custom HTTP interceptor that attaches a fresh Azure AD ID token to backend API calls.
 *
 * Why not use MSAL's built-in MsalInterceptor for the backend?
 * - MsalInterceptor uses protectedResourceMap with access_token scopes.
 * - The `{clientId}/.default` scope requires "Expose an API" configured in
 *   Azure AD portal, which adds deployment friction.
 * - Instead, we acquire a fresh ID token via acquireTokenSilent and attach it.
 *   The ID token's `aud` claim matches the clientId, which is exactly what the
 *   backend JWT middleware validates.
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

    // Skip token only for health check
    if (req.url.endsWith('/health')) {
      return next.handle(req);
    }

    const account = this.msalService.instance.getActiveAccount();
    if (!account) {
      // No active account — let the request go through without a token.
      // The backend will return 401 and the frontend guard will redirect to signin.
      return next.handle(req);
    }

    // Acquire a fresh token silently. This uses MSAL's token cache and only
    // makes a network call if the cached token is expired. Returns an ID token
    // that is guaranteed to be valid.
    return from(
      this.msalService.instance.acquireTokenSilent({
        scopes: ['openid', 'profile', 'email'],
        account: account
      })
    ).pipe(
      switchMap((result) => {
        const token = result.idToken;
        if (!token) {
          return next.handle(req);
        }
        const authReq = req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`
          }
        });
        return next.handle(authReq);
      }),
      catchError((error) => {
        // Silent token acquisition failed (e.g., refresh token expired,
        // user session ended). Send request without token — backend will
        // return 401 which the app can handle by redirecting to login.
        console.warn('BackendAuthInterceptor: silent token refresh failed, sending unauthenticated request', error?.errorCode || error?.message);
        return next.handle(req);
      })
    );
  }
}
