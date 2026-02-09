
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
   * Sign in with Microsoft 365 using popup
   */
  signInWithMicrosoft(): void {
    this.loginError = null;
    this.isLoggingIn = true;
    this.microsoftAuthService.loginRedirect();
  }

  /**
   * Alternative: Sign in with Microsoft 365 using redirect
   */
  signInWithMicrosoftRedirect(): void {
    this.microsoftAuthService.loginRedirect();
  }

  private handleMicrosoftLoginError(error: unknown): void {
    console.error('Microsoft sign-in failed:', error);
    this.isLoggingIn = false;
    this.loginError = 'Microsoft sign-in failed. Please try again.';
  }
}
