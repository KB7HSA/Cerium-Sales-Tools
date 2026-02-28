import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MsalModule, MsalService, MsalBroadcastService } from '@azure/msal-angular';
import { InteractionStatus, BrowserAuthError } from '@azure/msal-browser';
import { Subject, filter, takeUntil } from 'rxjs';
import { AuthService } from './shared/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterModule,
    MsalModule,
    CommonModule,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Cerium Sales Tools';
  isProcessingLogin = false;
  
  private readonly _destroying$ = new Subject<void>();
  private msalService = inject(MsalService);
  private msalBroadcastService = inject(MsalBroadcastService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private loginTimeoutId: any;

  ngOnInit(): void {
    // If a login redirect is in progress, show the loading overlay —
    // but only if the timestamp is recent (< 2 minutes). Stale flags from
    // interrupted redirects or dev-server restarts are auto-cleared.
    const loginInProgress = sessionStorage.getItem('msalLoginInProgress');
    const loginTimestamp = sessionStorage.getItem('msalLoginTimestamp');
    if (loginInProgress) {
      const elapsed = loginTimestamp ? Date.now() - parseInt(loginTimestamp, 10) : Infinity;
      if (elapsed < 120_000) { // 2 minutes
        this.isProcessingLogin = true;
        // Safety net: auto-dismiss the overlay after 30 seconds if MSAL
        // redirect handling never completes (e.g., network issue, MSAL bug)
        this.loginTimeoutId = setTimeout(() => {
          if (this.isProcessingLogin) {
            console.warn('MSAL login overlay stuck for 30s — auto-dismissing');
            this.isProcessingLogin = false;
            sessionStorage.removeItem('msalLoginInProgress');
            sessionStorage.removeItem('msalLoginTimestamp');
          }
        }, 30_000);
      } else {
        // Stale login flag — clear it so the user isn't stuck on a blank page
        console.warn('Clearing stale msalLoginInProgress flag (age:', Math.round(elapsed / 1000), 's)');
        sessionStorage.removeItem('msalLoginInProgress');
        sessionStorage.removeItem('msalLoginTimestamp');
      }
    }

    // Handle redirect observable for MSAL redirect flow
    // NOTE: Do NOT clear MSAL interaction state before this — MSAL needs
    // those keys to complete legitimate redirects from Microsoft.
    this.msalService.handleRedirectObservable().subscribe({
      next: (result) => {
        if (result) {
          console.log('MSAL redirect login successful:', result.account?.username);
          this.msalService.instance.setActiveAccount(result.account);
          
          // Sync user profile to backend
          sessionStorage.removeItem('msalLoginInProgress');
          sessionStorage.removeItem('msalLoginTimestamp');
          if (this.loginTimeoutId) { clearTimeout(this.loginTimeoutId); }
          this.authService.syncMicrosoftUser().subscribe({
            next: (syncResult) => {
              if (syncResult) {
                console.log('User profile synced after redirect:', syncResult.data?.user?.name);
              }
              this.isProcessingLogin = false;
              this.router.navigate(['/']);
            },
            error: (error) => {
              console.error('Profile sync failed after redirect:', error);
              this.isProcessingLogin = false;
              this.router.navigate(['/']);
            }
          });
        } else {
          // No redirect was processed — MSAL confirmed there's nothing pending.
          // NOW it's safe to clear any stale interaction keys left from a
          // previous session or server restart.
          this.clearStaleInteractionState();

          if (this.isProcessingLogin) {
            sessionStorage.removeItem('msalLoginInProgress');
            sessionStorage.removeItem('msalLoginTimestamp');
            this.isProcessingLogin = false;
          }
        }
      },
      error: (error) => {
        console.error('MSAL redirect error:', error);
        sessionStorage.removeItem('msalLoginInProgress');
        sessionStorage.removeItem('msalLoginTimestamp');
        this.isProcessingLogin = false;

        // If MSAL is stuck in interaction_in_progress or has any stale
        // auth state, clear everything and reload to recover gracefully
        if (error instanceof BrowserAuthError) {
          const recoverableCodes = [
            'interaction_in_progress',
            'no_cached_authority_error',
            'monitor_window_timeout',
            'redirect_in_iframe',
            'block_iframe_reload',
          ];
          if (recoverableCodes.includes(error.errorCode)) {
            console.warn(`Recovering from MSAL error [${error.errorCode}] — clearing state and reloading`);
            this.clearMsalBrowserStorage();
            window.location.reload();
            return;
          }
        }

        // For any other MSAL error, clear stale state to prevent
        // the blank-page problem on subsequent loads
        this.clearStaleInteractionState();
      }
    });

    // Monitor interaction status
    this.msalBroadcastService.inProgress$
      .pipe(
        filter((status: InteractionStatus) => status === InteractionStatus.None),
        takeUntil(this._destroying$)
      )
      .subscribe(() => {
        this.checkAndSetActiveAccount();
      });
  }

  /**
   * Clear stale MSAL interaction-in-progress markers from sessionStorage.
   * These can persist when the dev server restarts mid-redirect, preventing
   * the login page from loading until the user manually clears the cache.
   * 
   * This is ONLY called after handleRedirectObservable() returns null,
   * confirming there's no legitimate redirect to process.
   */
  private clearStaleInteractionState(): void {
    // MSAL v5 stores interaction state keys with the clientId prefix
    // e.g., "msal.712b4eda-bfde-4a28-90d2-aa645d4c6977.interaction.status"
    const keysToCheck: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (
        key.includes('interaction.status') ||
        key.includes('interaction_in_progress') ||
        key.includes('interaction_status') ||
        key.includes('.request.') ||           // MSAL v5 in-flight request state
        key.includes('.request.params') ||
        key.includes('.temp.cache')            // MSAL v5 temporary cache entries
      )) {
        keysToCheck.push(key);
      }
    }

    if (keysToCheck.length > 0) {
      console.warn('Clearing stale MSAL interaction keys (no redirect pending):', keysToCheck);
      keysToCheck.forEach(key => sessionStorage.removeItem(key));
    }
  }

  /**
   * Emergency cleanup: remove all MSAL-related keys from sessionStorage
   * to recover from a completely stuck state.
   */
  private clearMsalBrowserStorage(): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('msal.')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => sessionStorage.removeItem(key));
    sessionStorage.removeItem('msalLoginInProgress');
    sessionStorage.removeItem('msalLoginTimestamp');
    console.log('Cleared', keysToRemove.length, 'MSAL sessionStorage entries');
  }

  private checkAndSetActiveAccount(): void {
    const activeAccount = this.msalService.instance.getActiveAccount();
    if (!activeAccount) {
      const accounts = this.msalService.instance.getAllAccounts();
      if (accounts.length > 0) {
        this.msalService.instance.setActiveAccount(accounts[0]);
      }
    }
  }

  ngOnDestroy(): void {
    if (this.loginTimeoutId) {
      clearTimeout(this.loginTimeoutId);
    }
    this._destroying$.next(undefined);
    this._destroying$.complete();
  }
}
