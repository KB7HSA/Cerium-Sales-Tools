
import { Component } from '@angular/core';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import type { AuthenticationResult } from '@azure/msal-browser';
import { CommonModule } from '@angular/common';
import { LabelComponent } from '../../form/label/label.component';
import { CheckboxComponent } from '../../form/input/checkbox.component';
import { ButtonComponent } from '../../ui/button/button.component';
import { InputFieldComponent } from '../../form/input/input-field.component';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MicrosoftAuthService } from '../../../services/microsoft-auth.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-signin-form',
  imports: [
      CommonModule,
    LabelComponent,
    CheckboxComponent,
    ButtonComponent,
    InputFieldComponent,
    RouterModule,
    FormsModule
],
  templateUrl: './signin-form.component.html',
  styles: ``
})
export class SigninFormComponent {

  showPassword = false;
  isChecked = false;

  email = '';
  password = '';

  private microsoftAuthService = inject(MicrosoftAuthService);
  private authService = inject(AuthService);
  private router = inject(Router);

  isLoggingIn = false;
  loginError: string | null = null;
  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  onSignIn() {
    console.log('Email:', this.email);
    console.log('Password:', this.password);
    console.log('Remember Me:', this.isChecked);
    // Add your traditional email/password authentication logic here
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

  private handleMicrosoftLoginError(error: unknown): void {
    console.error('Microsoft sign-in failed:', error);
    this.isLoggingIn = false;
    this.loginError = 'Microsoft sign-in failed. Please try again.';
  }
}
