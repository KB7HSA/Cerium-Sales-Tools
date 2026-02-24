import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot } from '@angular/router';
import { RBACService, AppModule, Permission } from '../services/rbac.service';
import { AuthService } from '../services/auth.service';

/**
 * Route guard that checks if user has required permissions for a module
 * 
 * Usage in routes:
 * {
 *   path: 'labor-budget/admin',
 *   component: LaborBudgetAdminComponent,
 *   canActivate: [permissionGuard],
 *   data: { 
 *     module: AppModule.LABOR_BUDGET, 
 *     permission: Permission.ADMIN 
 *   }
 * }
 */
export const permissionGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const rbacService = inject(RBACService);
  const authService = inject(AuthService);
  const router = inject(Router);

  // Check if user is logged in
  if (!authService.isLoggedIn()) {
    router.navigate(['/signin']);
    return false;
  }

  // Get required module and permission from route data
  const requiredModule = route.data['module'] as AppModule;
  const requiredPermission = route.data['permission'] as Permission;

  // If no permission requirement specified, just check if logged in
  if (!requiredModule || !requiredPermission) {
    return true;
  }

  // Check if user has the required permission
  if (rbacService.hasPermission(requiredModule, requiredPermission)) {
    return true;
  }

  // User doesn't have permission - redirect to dashboard
  console.warn(`Access denied: User lacks ${requiredPermission} permission for ${requiredModule}`);
  router.navigate(['/']);
  return false;
};

/**
 * Guard specifically for admin routes
 * Checks if user has admin permission for the specified module
 */
export const adminGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const rbacService = inject(RBACService);
  const authService = inject(AuthService);
  const router = inject(Router);

  // Check if user is logged in
  if (!authService.isLoggedIn()) {
    router.navigate(['/signin']);
    return false;
  }

  // Get required module from route data
  const requiredModule = route.data['module'] as AppModule;

  // If no module specified, check if super admin
  if (!requiredModule) {
    if (rbacService.isSuperAdmin()) {
      return true;
    }
    router.navigate(['/']);
    return false;
  }

  // Check if user is admin for the module
  if (rbacService.isModuleAdmin(requiredModule)) {
    return true;
  }

  // User is not admin - redirect to dashboard
  console.warn(`Access denied: User is not admin for ${requiredModule}`);
  router.navigate(['/']);
  return false;
};

/**
 * Super admin only guard
 */
export const superAdminGuard: CanActivateFn = () => {
  const rbacService = inject(RBACService);
  const authService = inject(AuthService);
  const router = inject(Router);

  // Check if user is logged in
  if (!authService.isLoggedIn()) {
    router.navigate(['/signin']);
    return false;
  }

  // Check if super admin
  if (rbacService.isSuperAdmin()) {
    return true;
  }

  // Not a super admin
  console.warn('Access denied: Super admin access required');
  router.navigate(['/']);
  return false;
};
