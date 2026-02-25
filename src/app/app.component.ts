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

  ngOnInit(): void {
    // If a login redirect is in progress, show the loading overlay immediately
    const loginInProgress = sessionStorage.getItem('msalLoginInProgress');
    if (loginInProgress) {
      this.isProcessingLogin = true;
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
        this.isProcessingLogin = false;

        // If MSAL is stuck in interaction_in_progress, clear its state and reload
        if (error instanceof BrowserAuthError && error.errorCode === 'interaction_in_progress') {
          console.warn('Clearing stuck MSAL interaction state...');
          this.clearMsalBrowserStorage();
          window.location.reload();
        }
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
    // MSAL stores interaction state keys matching these patterns in sessionStorage
    const keysToCheck: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (
        key.includes('msal.interaction.status') ||
        key.includes('msal.interaction_in_progress') ||
        key.includes('interaction_status')
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
    this._destroying$.next(undefined);
    this._destroying$.complete();
  }
}
