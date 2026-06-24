import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { AuthService } from '../../../shared/services/auth.service';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-white dark:bg-gray-900">
      <div class="flex flex-col items-center space-y-8">
        <img
          src="/images/logo/Cerium_Large.png"
          alt="Cerium Sales Tools"
          class="h-16 w-auto"
        />
        <div class="relative">
          <div
            class="h-12 w-12 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600 dark:border-white/20 dark:border-t-brand-400"
          ></div>
        </div>
        <div class="text-center">
          <h2 class="text-lg font-semibold text-gray-800 dark:text-white">
            Signing you in...
          </h2>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Please wait while we verify your credentials.
          </p>
        </div>
      </div>
    </div>
  `,
  styles: ``
})
export class AuthCallbackComponent implements OnInit {
  private readonly msalService = inject(MsalService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    sessionStorage.removeItem('msalLoginInProgress');
    sessionStorage.removeItem('msalLoginTimestamp');

    // MSAL redirect is processed in APP_INITIALIZER before this component loads.
    const accounts = this.msalService.instance.getAllAccounts();
    if (accounts.length === 0) {
      console.warn('Auth callback: no MSAL account in cache after redirect');
      this.router.navigateByUrl('/signin');
      return;
    }

    if (!this.msalService.instance.getActiveAccount()) {
      this.msalService.instance.setActiveAccount(accounts[0]);
    }

    this.authService.syncMicrosoftUser().subscribe({
      next: () => this.router.navigateByUrl('/'),
      error: () => this.router.navigateByUrl('/'),
    });
  }
}
