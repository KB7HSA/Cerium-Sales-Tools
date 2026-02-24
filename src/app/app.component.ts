import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { MsalModule, MsalService, MsalBroadcastService } from '@azure/msal-angular';
import { InteractionStatus } from '@azure/msal-browser';
import { Subject, filter, takeUntil } from 'rxjs';
import { AuthService } from './shared/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterModule,
    MsalModule,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Cerium Sales Tools';
  
  private readonly _destroying$ = new Subject<void>();
  private msalService = inject(MsalService);
  private msalBroadcastService = inject(MsalBroadcastService);
  private authService = inject(AuthService);
  private router = inject(Router);

  ngOnInit(): void {
    // Handle redirect observable for MSAL redirect flow
    this.msalService.handleRedirectObservable().subscribe({
      next: (result) => {
        if (result) {
          console.log('MSAL redirect login successful:', result.account?.username);
          this.msalService.instance.setActiveAccount(result.account);
          
          // Check if we came from a login redirect and sync user profile
          const loginInProgress = sessionStorage.getItem('msalLoginInProgress');
          if (loginInProgress) {
            sessionStorage.removeItem('msalLoginInProgress');
            
            // Sync user profile to backend
            this.authService.syncMicrosoftUser().subscribe({
              next: (syncResult) => {
                if (syncResult) {
                  console.log('User profile synced after redirect:', syncResult.data?.user?.name);
                }
                this.router.navigate(['/']);
              },
              error: (error) => {
                console.error('Profile sync failed after redirect:', error);
                this.router.navigate(['/']);
              }
            });
          }
        }
      },
      error: (error) => {
        console.error('MSAL redirect error:', error);
        sessionStorage.removeItem('msalLoginInProgress');
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
