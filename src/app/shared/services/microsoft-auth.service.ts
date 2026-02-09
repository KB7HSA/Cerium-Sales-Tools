import { Injectable, inject } from '@angular/core';
import { MsalService, MsalBroadcastService } from '@azure/msal-angular';
import { InteractionStatus, AuthenticationResult, PopupRequest, RedirectRequest, EndSessionRequest } from '@azure/msal-browser';
import { Observable, Subject, filter, takeUntil } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MicrosoftAuthService {
  private readonly _destroying$ = new Subject<void>();
  private authService = inject(MsalService);
  private msalBroadcastService = inject(MsalBroadcastService);

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
   * Logout the user
   */
  logout(): void {
    const logoutRequest: EndSessionRequest = {
      account: this.authService.instance.getActiveAccount()
    };

    this.authService.logoutPopup(logoutRequest).subscribe(() => {
      this.isAuthenticated = false;
      this.username = null;
    });
  }

  /**
   * Logout using redirect
   */
  logoutRedirect(): void {
    this.authService.logoutRedirect();
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

  ngOnDestroy(): void {
    this._destroying$.next(undefined);
    this._destroying$.complete();
  }
}
