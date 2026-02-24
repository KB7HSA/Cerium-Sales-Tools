import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MsalService, MsalBroadcastService } from '@azure/msal-angular';
import { InteractionStatus, AuthenticationResult, PopupRequest, RedirectRequest, EndSessionRequest } from '@azure/msal-browser';
import { Observable, Subject, filter, takeUntil, switchMap, of, catchError } from 'rxjs';

export interface MicrosoftUserProfile {
  id: string;
  displayName: string;
  givenName: string;
  surname: string;
  mail: string;
  userPrincipalName: string;
  jobTitle?: string;
  officeLocation?: string;
  mobilePhone?: string;
  businessPhones?: string[];
  department?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MicrosoftAuthService {
  private readonly _destroying$ = new Subject<void>();
  private authService = inject(MsalService);
  private msalBroadcastService = inject(MsalBroadcastService);
  private http = inject(HttpClient);
  
  private readonly graphUrl = 'https://graph.microsoft.com/v1.0/me';

  isAuthenticated = false;
  username: string | null = null;

  constructor() {
    this.initializeAuthStatus();
  }

  private initializeAuthStatus(): void {
    this.msalBroadcastService.inProgress$
      .pipe(
        filter((status: InteractionStatus) => status === InteractionStatus.None),
        takeUntil(this._destroying$)
      )
      .subscribe(() => {
        this.setAuthStatus();
      });
  }

  private setAuthStatus(): void {
    const accounts = this.authService.instance.getAllAccounts();
    this.isAuthenticated = accounts.length > 0;
    
    if (accounts.length > 0) {
      this.authService.instance.setActiveAccount(accounts[0]);
      this.username = accounts[0].name || accounts[0].username;
    }
  }

  /**
   * Login using popup method
   */
  loginPopup(): Observable<AuthenticationResult> {
    const loginRequest: PopupRequest = {
      scopes: ['User.Read', 'openid', 'profile', 'email']
    };

    return new Observable(observer => {
      this.authService.loginPopup(loginRequest)
        .subscribe({
          next: (result: AuthenticationResult) => {
            this.setAuthStatus();
            observer.next(result);
            observer.complete();
          },
          error: (error) => {
            console.error('Login failed:', error);
            observer.error(error);
          }
        });
    });
  }

  /**
   * Login using redirect method
   */
  loginRedirect(): void {
    const loginRequest: RedirectRequest = {
      scopes: ['User.Read', 'openid', 'profile', 'email']
    };

    this.authService.loginRedirect(loginRequest);
  }

  /**
   * Logout the user using popup
   */
  logout(): Observable<void> {
    const logoutRequest: EndSessionRequest = {
      account: this.authService.instance.getActiveAccount()
    };

    return new Observable(observer => {
      this.authService.logoutPopup(logoutRequest).subscribe({
        next: () => {
          this.isAuthenticated = false;
          this.username = null;
          observer.next();
          observer.complete();
        },
        error: (error) => {
          console.error('Microsoft logout error:', error);
          // Still reset local state
          this.isAuthenticated = false;
          this.username = null;
          observer.next();
          observer.complete();
        }
      });
    });
  }

  /**
   * Logout using redirect
   */
  logoutRedirect(postLogoutRedirectUri?: string): void {
    const logoutRequest: EndSessionRequest = {
      account: this.authService.instance.getActiveAccount(),
      postLogoutRedirectUri: postLogoutRedirectUri || window.location.origin
    };
    
    this.isAuthenticated = false;
    this.username = null;
    this.authService.logoutRedirect(logoutRequest);
  }

  /**
   * Get the active account
   */
  getActiveAccount() {
    return this.authService.instance.getActiveAccount();
  }

  /**
   * Get all accounts
   */
  getAllAccounts() {
    return this.authService.instance.getAllAccounts();
  }

  /**
   * Acquire token silently
   */
  acquireTokenSilent(scopes: string[]): Observable<AuthenticationResult> {
    const account = this.authService.instance.getActiveAccount();
    
    if (!account) {
      throw new Error('No active account');
    }

    const request = {
      scopes: scopes,
      account: account
    };

    return this.authService.acquireTokenSilent(request);
  }

  /**
   * Get user profile from Microsoft Graph API
   */
  getUserProfile(): Observable<MicrosoftUserProfile | null> {
    return this.acquireTokenSilent(['User.Read']).pipe(
      switchMap((tokenResult: AuthenticationResult) => {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${tokenResult.accessToken}`
        });

        return this.http.get<MicrosoftUserProfile>(this.graphUrl, { headers });
      }),
      catchError((error) => {
        console.error('Failed to get user profile:', error);
        return of(null);
      })
    );
  }

  /**
   * Get the current user's account info from MSAL cache
   */
  getCurrentUserInfo(): { id: string; email: string; name: string } | null {
    const account = this.authService.instance.getActiveAccount();
    if (!account) {
      return null;
    }
    
    return {
      id: account.localAccountId,
      email: account.username,
      name: account.name || account.username
    };
  }

  ngOnDestroy(): void {
    this._destroying$.next(undefined);
    this._destroying$.complete();
  }
}
