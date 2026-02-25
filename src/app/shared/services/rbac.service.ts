import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { AuthService, CurrentUser } from './auth.service';

/**
 * Application modules with role-based access
 */
export enum AppModule {
  LABOR_BUDGET = 'labor-budget',
  MSP_SERVICES = 'msp-services',
  SOW_DOCUMENTS = 'sow-documents',
  E_RATE = 'e-rate',
  QUOTE_MANAGEMENT = 'quote-management'
}

/**
 * Permission levels within each module
 */
export enum Permission {
  VIEW = 'view',           // Can view data
  CREATE = 'create',       // Can create new records
  EDIT = 'edit',          // Can edit existing records
  DELETE = 'delete',      // Can delete records
  ADMIN = 'admin'         // Full admin access including settings
}

/**
 * Role types
 */
export enum RoleType {
  SUPER_ADMIN = 'super-admin',    // Full access to everything
  MODULE_ADMIN = 'module-admin',   // Admin for specific modules
  USER = 'user',                   // Regular user access
  READONLY = 'readonly',           // Read-only access
  PENDING = 'pending'              // No permissions - awaiting Super Admin approval
}

/**
 * User role assignment for a specific module
 */
export interface ModuleRole {
  module: AppModule;
  permissions: Permission[];
}

/**
 * Complete user permissions
 */
export interface UserPermissions {
  roleType: RoleType;
  moduleRoles: ModuleRole[];
}

@Injectable({
  providedIn: 'root'
})
export class RBACService {
  private authService = inject(AuthService);

  /**
   * Get current user's permissions
   */
  getUserPermissions(): UserPermissions | null {
    const user = this.authService.getCurrentUser();
    if (!user) {
      return null;
    }

    // Parse permissions from user role and custom attributes
    return this.parseUserPermissions(user);
  }

  /**
   * Parse user object to extract permissions
   */
  private parseUserPermissions(user: CurrentUser): UserPermissions {
    // Default: regular users get view permissions for all modules
    let roleType: RoleType = RoleType.USER;
    const moduleRoles: ModuleRole[] = [];

    // Determine role type from user.role
    if (user.role === 'admin') {
      roleType = RoleType.SUPER_ADMIN;
      // Super admins get all permissions for all modules
      Object.values(AppModule).forEach(module => {
        moduleRoles.push({
          module,
          permissions: Object.values(Permission)
        });
      });
    } else if (user.role === 'manager') {
      roleType = RoleType.MODULE_ADMIN;
      // Managers get admin access to assigned modules (default: all)
      Object.values(AppModule).forEach(module => {
        moduleRoles.push({
          module,
          permissions: [Permission.VIEW, Permission.CREATE, Permission.EDIT, Permission.ADMIN]
        });
      });
    } else if (user.role === 'readonly') {
      roleType = RoleType.READONLY;
      // Readonly users can only view
      Object.values(AppModule).forEach(module => {
        moduleRoles.push({
          module,
          permissions: [Permission.VIEW]
        });
      });
    } else if (user.role === 'pending') {
      roleType = RoleType.PENDING;
      // Pending users have no permissions - awaiting Super Admin approval
    } else {
      // Regular users get view, create, and edit
      Object.values(AppModule).forEach(module => {
        moduleRoles.push({
          module,
          permissions: [Permission.VIEW, Permission.CREATE, Permission.EDIT]
        });
      });
    }

    return { roleType, moduleRoles };
  }

  /**
   * Check if user has a specific permission for a module
   */
  hasPermission(module: AppModule, permission: Permission): boolean {
    const permissions = this.getUserPermissions();
    if (!permissions) {
      return false;
    }

    // Super admin has all permissions
    if (permissions.roleType === RoleType.SUPER_ADMIN) {
      return true;
    }

    // Check module-specific permissions
    const moduleRole = permissions.moduleRoles.find(mr => mr.module === module);
    if (!moduleRole) {
      return false;
    }

    // Admin permission includes all other permissions
    if (moduleRole.permissions.includes(Permission.ADMIN)) {
      return true;
    }

    return moduleRole.permissions.includes(permission);
  }

  /**
   * Check if user can access admin features for a module
   */
  isModuleAdmin(module: AppModule): boolean {
    return this.hasPermission(module, Permission.ADMIN);
  }

  /**
   * Check if user is a super admin
   */
  isSuperAdmin(): boolean {
    const permissions = this.getUserPermissions();
    return permissions?.roleType === RoleType.SUPER_ADMIN;
  }

  /**
   * Get all modules the user has access to
   */
  getAccessibleModules(): AppModule[] {
    const permissions = this.getUserPermissions();
    if (!permissions) {
      return [];
    }

    return permissions.moduleRoles
      .filter(mr => mr.permissions.length > 0)
      .map(mr => mr.module);
  }

  /**
   * Get permissions for a specific module
   */
  getModulePermissions(module: AppModule): Permission[] {
    const permissions = this.getUserPermissions();
    if (!permissions) {
      return [];
    }

    if (permissions.roleType === RoleType.SUPER_ADMIN) {
      return Object.values(Permission);
    }

    const moduleRole = permissions.moduleRoles.find(mr => mr.module === module);
    return moduleRole?.permissions || [];
  }

  /**
   * Observable to watch permission changes
   */
  hasPermission$(module: AppModule, permission: Permission): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      map(() => this.hasPermission(module, permission))
    );
  }

  /**
   * Observable to watch if user is module admin
   */
  isModuleAdmin$(module: AppModule): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      map(() => this.isModuleAdmin(module))
    );
  }

  /**
   * Check if user has any of the specified permissions
   */
  hasAnyPermission(module: AppModule, permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(module, permission));
  }

  /**
   * Check if user has all of the specified permissions
   */
  hasAllPermissions(module: AppModule, permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(module, permission));
  }

  /**
   * Get user's role display name
   */
  getRoleDisplayName(): string {
    const permissions = this.getUserPermissions();
    if (!permissions) {
      return 'Guest';
    }

    switch (permissions.roleType) {
      case RoleType.SUPER_ADMIN:
        return 'Super Admin';
      case RoleType.MODULE_ADMIN:
        return 'Manager';
      case RoleType.READONLY:
        return 'Read Only';
      case RoleType.PENDING:
        return 'Pending Approval';
      default:
        return 'User';
    }
  }

  /**
   * Get module display name
   */
  getModuleDisplayName(module: AppModule): string {
    const names: Record<AppModule, string> = {
      [AppModule.LABOR_BUDGET]: 'Labor Budget',
      [AppModule.MSP_SERVICES]: 'MSP Services',
      [AppModule.SOW_DOCUMENTS]: 'SOW Documents',
      [AppModule.E_RATE]: 'E-Rate',
      [AppModule.QUOTE_MANAGEMENT]: 'Quote Management'
    };
    return names[module];
  }
}
