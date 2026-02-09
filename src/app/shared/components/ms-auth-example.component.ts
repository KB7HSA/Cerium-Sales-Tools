import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MicrosoftAuthService } from '../services/microsoft-auth.service';
import { HttpClient } from '@angular/common/http';

/**
 * Example component demonstrating Microsoft authentication usage
 * 
 * This component shows:
 * - How to check authentication status
 * - How to get user information
 * - How to call Microsoft Graph API
 * - How to handle sign out
 */
@Component({
  selector: 'app-ms-auth-example',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 max-w-2xl mx-auto">
      <h2 class="text-2xl font-bold mb-4">Microsoft Authentication Status</h2>
      
      <!-- Authentication Status -->
      <div class="mb-6 p-4 rounded-lg" 
           [ngClass]="isAuthenticated ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-800'">
        <p class="font-semibold mb-2">
          Status: 
          <span [ngClass]="isAuthenticated ? 'text-green-600' : 'text-gray-600'">
            {{ isAuthenticated ? 'Authenticated' : 'Not Authenticated' }}
          </span>
        </p>
        
        <div *ngIf="isAuthenticated && account">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            <strong>Name:</strong> {{ account.name }}
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            <strong>Email:</strong> {{ account.username }}
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            <strong>Tenant ID:</strong> {{ account.tenantId }}
          </p>
        </div>
      </div>

      <!-- User Profile from Graph API -->
      <div *ngIf="userProfile" class="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h3 class="font-semibold mb-2 text-blue-900 dark:text-blue-100">
          Microsoft Graph Profile
        </h3>
        <div class="space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <p><strong>Display Name:</strong> {{ userProfile.displayName }}</p>
          <p><strong>Job Title:</strong> {{ userProfile.jobTitle || 'N/A' }}</p>
          <p><strong>Department:</strong> {{ userProfile.department || 'N/A' }}</p>
          <p><strong>Office Location:</strong> {{ userProfile.officeLocation || 'N/A' }}</p>
          <p><strong>User Principal Name:</strong> {{ userProfile.userPrincipalName }}</p>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-3">
        <button 
          *ngIf="!isAuthenticated"
          (click)="signIn()"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Sign In with Microsoft
        </button>

        <button 
          *ngIf="isAuthenticated"
          (click)="getUserProfile()"
          [disabled]="loadingProfile"
          class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50">
          {{ loadingProfile ? 'Loading...' : 'Load Graph Profile' }}
        </button>

        <button 
          *ngIf="isAuthenticated"
          (click)="signOut()"
          class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
          Sign Out
        </button>
      </div>

      <!-- Error Display -->
      <div *ngIf="error" class="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <p class="text-sm text-red-600 dark:text-red-400">
          <strong>Error:</strong> {{ error }}
        </p>
      </div>
    </div>
  `
})
export class MsAuthExampleComponent implements OnInit {
  private microsoftAuth = inject(MicrosoftAuthService);
  private http = inject(HttpClient);

  isAuthenticated = false;
  account: any = null;
  userProfile: any = null;
  loadingProfile = false;
  error: string | null = null;

  ngOnInit(): void {
    this.checkAuthStatus();
  }

  checkAuthStatus(): void {
    this.isAuthenticated = this.microsoftAuth.isAuthenticated;
    this.account = this.microsoftAuth.getActiveAccount();
  }

  signIn(): void {
    this.error = null;
    this.microsoftAuth.loginPopup().subscribe({
      next: (result) => {
        console.log('Sign-in successful:', result);
        this.checkAuthStatus();
      },
      error: (error) => {
        console.error('Sign-in failed:', error);
        this.error = error.message || 'Sign-in failed';
      }
    });
  }

  signOut(): void {
    this.microsoftAuth.logout();
    this.isAuthenticated = false;
    this.account = null;
    this.userProfile = null;
  }

  /**
   * Example: Call Microsoft Graph API to get user profile
   */
  getUserProfile(): void {
    this.loadingProfile = true;
    this.error = null;

    this.microsoftAuth.acquireTokenSilent(['User.Read']).subscribe({
      next: (result) => {
        // Call Microsoft Graph API
        this.http.get('https://graph.microsoft.com/v1.0/me', {
          headers: {
            Authorization: `Bearer ${result.accessToken}`
          }
        }).subscribe({
          next: (profile) => {
            this.userProfile = profile;
            this.loadingProfile = false;
          },
          error: (error) => {
            console.error('Failed to get profile:', error);
            this.error = 'Failed to load profile from Microsoft Graph';
            this.loadingProfile = false;
          }
        });
      },
      error: (error) => {
        console.error('Token acquisition failed:', error);
        this.error = 'Failed to acquire access token';
        this.loadingProfile = false;
      }
    });
  }
}
