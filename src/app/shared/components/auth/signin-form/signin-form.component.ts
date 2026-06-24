
import { Component, OnInit } from '@angular/core';
import { inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import type { AuthenticationResult } from '@azure/msal-browser';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MicrosoftAuthService } from '../../../services/microsoft-auth.service';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-signin-form',
  imports: [
    CommonModule,
    RouterModule,
  ],
  templateUrl: './signin-form.component.html',
  styles: ``
})
export class SigninFormComponent implements OnInit {



  private microsoftAuthService = inject(MicrosoftAuthService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isLoggingIn = false;
  loginError: string | null = null;
  readonly showDevelopmentBypass = !environment.production;

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('devBypass') === '1') {
      this.useDevelopmentBypass();
    }
  }

  /**
   * Sign in with Microsoft 365 using redirect
   * Note: isLoggingIn state will be lost after redirect, but that's expected behavior
   */
  signInWithMicrosoft(): void {
    this.loginError = null;
    this.isLoggingIn = true;
    // Store state in sessionStorage so we can restore it after redirect
    sessionStorage.setItem('msalLoginInProgress', 'true');
    sessionStorage.setItem('msalLoginTimestamp', Date.now().toString());
    this.microsoftAuthService.loginRedirect();
  }

  /**
   * Alternative: Sign in with Microsoft 365 using popup (better UX, no page reload)
   */
  signInWithMicrosoftPopup(): void {
    this.loginError = null;
    this.isLoggingIn = true;
    this.microsoftAuthService.loginPopup().subscribe({
      next: (result) => {
        console.log('Microsoft sign-in successful:', result.account?.username);
        
        // Sync user profile to backend
        this.authService.syncMicrosoftUser().subscribe({
          next: (syncResult) => {
            this.isLoggingIn = false;
            if (syncResult) {
              console.log('User profile synced:', syncResult.data?.user?.name);
            }
            this.router.navigate(['/']);
          },
          error: (error) => {
            console.error('Profile sync failed, but login succeeded:', error);
            this.isLoggingIn = false;
            this.router.navigate(['/']);
          }
        });
      },
      error: (error) => {
        this.handleMicrosoftLoginError(error);
      }
    });
  }

  useDevelopmentBypass(): void {
    if (!this.authService.enableDevelopmentBypass()) {
      this.loginError = 'Development bypass is not available in production.';
      return;
    }

    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/';
    this.router.navigateByUrl(returnUrl);
  }

  private handleMicrosoftLoginError(error: unknown): void {
    console.error('Microsoft sign-in failed:', error);
    this.isLoggingIn = false;
    this.loginError = 'Microsoft sign-in failed. Please try again.';
  }
}
