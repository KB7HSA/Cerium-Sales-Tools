import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, tap, catchError, of, switchMap } from 'rxjs';
import { MicrosoftAuthService, MicrosoftUserProfile } from './microsoft-auth.service';
import { environment } from '../../../environments/environment';

export interface UserRoleAssignment {
  Id: number;
  UserId: string;
  ModuleName: string;
  Permissions: string;
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'user' | 'readonly';
  status: string;
  department?: string;
  roleAssignments?: UserRoleAssignment[];
  profile?: {
    firstName: string;
    lastName: string;
    jobTitle: string;
    location: string;
    phone: string;
  };
}

export interface SyncResponse {
  success: boolean;
  data: {
    user: CurrentUser;
    profile: {
      firstName: string;
      lastName: string;
      jobTitle: string;
      location: string;
      email: string;
      phone: string;
    };
    isNewUser: boolean;
  };
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private microsoftAuthService = inject(MicrosoftAuthService);
  private router = inject(Router);
  
  private readonly apiUrl = environment.apiUrl || 'http://localhost:3000/api';
  
  private currentUserSubject = new BehaviorSubject<CurrentUser | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    this.loadUserFromStorage();
  }

  /**
   * Load user from local storage on app init
   */
  private loadUserFromStorage(): void {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        this.currentUserSubject.next(user);
      } catch (e) {
        localStorage.removeItem('currentUser');
      }
    }
  }

  /**
   * Save user to local storage
   */
  private saveUserToStorage(user: CurrentUser): void {
    localStorage.setItem('currentUser', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  /**
   * Clear user from storage
   */
  private clearUserFromStorage(): void {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('tailadmin.profile'); // Clear profile store
    sessionStorage.removeItem('msalLoginInProgress');
    this.currentUserSubject.next(null);
  }

  /**
   * Get current logged in user
   */
  getCurrentUser(): CurrentUser | null {
    return this.currentUserSubject.value;
  }

  /**
   * Check if user is logged in
   */
  isLoggedIn(): boolean {
    return this.currentUserSubject.value !== null;
  }

  /**
   * Sync Microsoft user profile to backend after M365 login
   */
  syncMicrosoftUser(): Observable<SyncResponse | null> {
    return this.microsoftAuthService.getUserProfile().pipe(
      switchMap((profile: MicrosoftUserProfile | null) => {
        if (!profile) {
          console.error('Could not get Microsoft profile');
          return of(null);
        }

        console.log('Syncing Microsoft profile to backend:', profile.displayName);
        
        return this.http.post<SyncResponse>(`${this.apiUrl}/auth/microsoft/sync`, {
          profile
        });
      }),
      tap((response) => {
        if (response?.success && response.data) {
          const user: CurrentUser = {
            ...response.data.user,
            profile: response.data.profile
          };
          this.saveUserToStorage(user);
          console.log('User synced successfully:', user.email);
        }
      }),
      catchError((error) => {
        console.error('Failed to sync user to backend:', error);
        
        // Fallback: create user from MSAL cache if backend sync fails
        const msalUser = this.microsoftAuthService.getCurrentUserInfo();
        if (msalUser) {
          const fallbackUser: CurrentUser = {
            id: msalUser.id,
            name: msalUser.name,
            email: msalUser.email,
            role: 'user',
            status: 'active'
          };
          this.saveUserToStorage(fallbackUser);
        }
        
        return of(null);
      })
    );
  }

  /**
   * Fetch user by email from backend
   */
  fetchUserByEmail(email: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/auth/user/${encodeURIComponent(email)}`);
  }

  /**
   * Logout user - clears local state and signs out of Microsoft
   */
  logout(): void {
    this.clearUserFromStorage();
    this.microsoftAuthService.logout().subscribe({
      next: () => {
        console.log('Logged out successfully');
        this.router.navigate(['/signin']);
      },
      error: (error) => {
        console.error('Logout error:', error);
        // Still navigate to sign-in even if logout fails
        this.router.navigate(['/signin']);
      }
    });
  }

  /**
   * Logout using redirect
   */
  logoutRedirect(): void {
    this.clearUserFromStorage();
    const redirectUri = window.location.origin + '/signin';
    this.microsoftAuthService.logoutRedirect(redirectUri);
  }
}
