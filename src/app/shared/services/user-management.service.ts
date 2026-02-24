import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap, catchError, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export type RoleType = 'admin' | 'manager' | 'user' | 'readonly';
export type AppModule = 'labor-budget' | 'msp-services' | 'sow-documents' | 'e-rate' | 'quote-management';
export type Permission = 'view' | 'create' | 'edit' | 'delete' | 'admin';

export interface ModulePermissions {
  module: AppModule;
  permissions: Permission[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: RoleType;
  status: 'active' | 'inactive';
  department?: string;
  joinDate: string;
  lastLogin?: string;
  modulePermissions?: ModulePermissions[];
}

@Injectable({
  providedIn: 'root'
})
export class UserManagementService {
  private readonly API_URL = environment.apiUrl || 'http://localhost:3000/api';
  private usersSubject = new BehaviorSubject<User[]>([]);

  public users$ = this.usersSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadUsersFromBackend();
  }

  private loadUsersFromBackend(): void {
    this.http.get<any>(`${this.API_URL}/auth/users`).pipe(
      tap(response => {
        if (response.success && response.data) {
          const users: User[] = response.data.map((u: any) => this.mapBackendUserToUser(u));
          this.usersSubject.next(users);
        }
      }),
      catchError(error => {
        console.error('Failed to load users from backend:', error);
        return of([]);
      })
    ).subscribe();
  }

  private mapBackendUserToUser(backendUser: any): User {
    return {
      id: backendUser.Id || backendUser.id,
      name: backendUser.Name || backendUser.name,
      email: backendUser.Email || backendUser.email,
      role: this.mapBackendRole(backendUser.RoleName || backendUser.roleName || backendUser.role),
      status: (backendUser.Status || backendUser.status) === 'active' ? 'active' : 'inactive',
      department: backendUser.Department || backendUser.department,
      joinDate: this.formatDate(backendUser.CreatedAt || backendUser.createdAt),
      lastLogin: this.formatDate(backendUser.LastLoginAt || backendUser.lastLoginAt),
      modulePermissions: this.mapModulePermissions(backendUser.modulePermissions || [])
    };
  }

  private mapBackendRole(backendRole: string): RoleType {
    const roleMap: { [key: string]: RoleType } = {
      'admin': 'admin',
      'manager': 'manager',
      'user': 'user',
      'readonly': 'readonly'
    };
    return roleMap[backendRole] || 'user';
  }

  private mapModulePermissions(permissions: any[]): ModulePermissions[] {
    return permissions.map(p => ({
      module: p.moduleName || p.module,
      permissions: (p.permissions || '').split(',').filter((perm: string) => perm.trim())
    }));
  }

  private formatDate(date: any): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString();
  }

  getUsers(): User[] {
    return this.usersSubject.value;
  }

  getUserById(id: string): User | undefined {
    return this.usersSubject.value.find(u => u.id === id);
  }

  getUserByEmail(email: string): Observable<User | null> {
    return this.http.get<any>(`${this.API_URL}/auth/user/${email}`).pipe(
      tap(response => {
        if (response.success && response.data) {
          return this.mapBackendUserToUser(response.data);
        }
        return null;
      }),
      catchError(error => {
        console.error('Failed to get user by email:', error);
        return of(null);
      })
    );
  }

  refreshUsers(): void {
    this.loadUsersFromBackend();
  }

  updateUserRole(userId: string, role: RoleType): Observable<boolean> {
    return this.http.put<any>(`${this.API_URL}/auth/users/${userId}/role`, { role }).pipe(
      tap(response => {
        if (response.success) {
          this.loadUsersFromBackend(); // Refresh the list
        }
      }),
      catchError(error => {
        console.error('Failed to update user role:', error);
        return of(false);
      })
    );
  }

  updateModulePermissions(userId: string, moduleName: AppModule, permissions: Permission[]): Observable<boolean> {
    return this.http.put<any>(`${this.API_URL}/auth/users/${userId}/modules/${moduleName}/permissions`, { permissions }).pipe(
      tap(response => {
        if (response.success) {
          this.loadUsersFromBackend(); // Refresh the list
        }
      }),
      catchError(error => {
        console.error('Failed to update module permissions:', error);
        return of(false);
      })
    );
  }

  removeModuleAccess(userId: string, moduleName: AppModule): Observable<boolean> {
    return this.http.delete<any>(`${this.API_URL}/auth/users/${userId}/modules/${moduleName}`).pipe(
      tap(response => {
        if (response.success) {
          this.loadUsersFromBackend(); // Refresh the list
        }
      }),
      catchError(error => {
        console.error('Failed to remove module access:', error);
        return of(false);
      })
    );
  }

  getUserModulePermissions(userId: string): Observable<ModulePermissions[]> {
    return this.http.get<any>(`${this.API_URL}/auth/users/${userId}/roles`).pipe(
      tap(response => {
        if (response.success && response.data) {
          return this.mapModulePermissions(response.data);
        }
        return [];
      }),
      catchError(error => {
        console.error('Failed to get user module permissions:', error);
        return of([]);
      })
    );
  }

  // Legacy methods for compatibility
  updateUser(id: string, updates: Partial<User>): void {
    console.warn('updateUser() is deprecated. Use updateUserRole() or updateModulePermissions() instead.');
  }

  deleteUser(id: string): void {
    console.warn('deleteUser() not implemented for backend. Users should be deactivated instead.');
  }

  updateLastLogin(id: string): void {
    // This is handled by backend on login
  }

  getAdminUsers(): User[] {
    return this.usersSubject.value.filter(u => u.role === 'admin');
  }

  getManagerUsers(): User[] {
    return this.usersSubject.value.filter(u => u.role === 'manager');
  }

  getStandardUsers(): User[] {
    return this.usersSubject.value.filter(u => u.role === 'user');
  }

  getActiveUsers(): User[] {
    return this.usersSubject.value.filter(u => u.status === 'active');
  }

  getInactiveUsers(): User[] {
    return this.usersSubject.value.filter(u => u.status === 'inactive');
  }
}
