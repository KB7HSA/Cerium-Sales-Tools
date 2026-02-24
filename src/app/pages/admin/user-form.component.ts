import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { UserManagementService, User, RoleType, AppModule, Permission, ModulePermissions } from '../../shared/services/user-management.service';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './user-form.component.html',
  styleUrl: './user-form.component.css',
})
export class UserFormComponent implements OnInit {
  isEditMode = false;
  userId: string | null = null;
  currentUser: User | null = null;

  // Form fields
  name: string = '';
  email: string = '';
  role: RoleType = 'user';
  status: 'active' | 'inactive' = 'active';
  department: string = '';

  // Module permissions
  modules: AppModule[] = ['labor-budget', 'msp-services', 'sow-documents', 'e-rate', 'quote-management'];
  modulePermissions: Map<AppModule, Set<Permission>> = new Map();
  allPermissions: Permission[] = ['view', 'create', 'edit', 'delete', 'admin'];

  // For validation
  submitted = false;
  errorMessage: string = '';
  successMessage: string = '';

  constructor(
    private userService: UserManagementService,
    private activatedRoute: ActivatedRoute,
    private router: Router
  ) {
    // Initialize module permissions
    this.modules.forEach(module => {
      this.modulePermissions.set(module, new Set<Permission>());
    });
  }

  ngOnInit(): void {
    this.activatedRoute.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.userId = params['id'];
        this.loadUser(params['id']);
      }
    });
  }

  loadUser(userId: string): void {
    const user = this.userService.getUserById(userId);
    if (user) {
      this.currentUser = user;
      this.name = user.name;
      this.email = user.email;
      this.role = user.role;
      this.status = user.status;
      this.department = user.department || '';

      // Load module permissions
      if (user.modulePermissions) {
        user.modulePermissions.forEach(mp => {
          const permSet = new Set(mp.permissions);
          this.modulePermissions.set(mp.module, permSet);
        });
      }
    }
  }

  hasPermission(module: AppModule, permission: Permission): boolean {
    return this.modulePermissions.get(module)?.has(permission) || false;
  }

  togglePermission(module: AppModule, permission: Permission): void {
    const perms = this.modulePermissions.get(module) || new Set<Permission>();
    
    if (perms.has(permission)) {
      perms.delete(permission);
    } else {
      perms.add(permission);
      // If adding 'admin', automatically add all other permissions
      if (permission === 'admin') {
        ['view', 'create', 'edit', 'delete'].forEach(p => perms.add(p as Permission));
      }
    }
    
    this.modulePermissions.set(module, perms);
  }

  selectAllPermissions(module: AppModule): void {
    const perms = new Set(this.allPermissions);
    this.modulePermissions.set(module, perms);
  }

  clearAllPermissions(module: AppModule): void {
    this.modulePermissions.set(module, new Set<Permission>());
  }

  getModuleDisplayName(module: AppModule): string {
    const names: Record<AppModule, string> = {
      'labor-budget': 'Labor Budget',
      'msp-services': 'MSP Services',
      'sow-documents': 'SOW Documents',
      'e-rate': 'E-Rate',
      'quote-management': 'Quote Management'
    };
    return names[module];
  }

  getPermissionDisplayName(permission: Permission): string {
    const names: Record<Permission, string> = {
      'view': 'View',
      'create': 'Create',
      'edit': 'Edit',
      'delete': 'Delete',
      'admin': 'Admin'
    };
    return names[permission];
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  submitForm(): void {
    this.submitted = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Validation
    if (!this.name.trim()) {
      this.errorMessage = 'Name is required';
      return;
    }

    if (!this.email.trim()) {
      this.errorMessage = 'Email is required';
      return;
    }

    if (!this.isValidEmail(this.email)) {
      this.errorMessage = 'Please enter a valid email address';
      return;
    }

    if (!this.isEditMode) {
      this.errorMessage = 'Only existing users from M365 authentication can have their permissions updated. Users cannot be created manually.';
      return;
    }

    if (this.isEditMode && this.userId) {
      // Update user role
      this.userService.updateUserRole(this.userId, this.role).subscribe({
        next: (success) => {
          if (success) {
            this.updateModulePermissions();
          } else {
            this.errorMessage = 'Failed to update user role';
          }
        },
        error: (error) => {
          this.errorMessage = 'An error occurred while updating user role';
          console.error(error);
        }
      });
    }
  }

  updateModulePermissions(): void {
    if (!this.userId) return;

    let updatesCompleted = 0;
    const totalUpdates = this.modules.length;

    this.modules.forEach(module => {
      const perms = Array.from(this.modulePermissions.get(module) || []);
      
      if (perms.length === 0) {
        // Remove module access if no permissions
        this.userService.removeModuleAccess(this.userId!, module).subscribe({
          next: () => {
            updatesCompleted++;
            if (updatesCompleted === totalUpdates) {
              this.successMessage = 'User permissions updated successfully!';
              setTimeout(() => this.router.navigate(['/admin/users']), 2000);
            }
          },
          error: (error) => {
            console.error(`Failed to remove ${module} access:`, error);
            updatesCompleted++;
          }
        });
      } else {
        // Update module permissions
        this.userService.updateModulePermissions(this.userId!, module, perms).subscribe({
          next: () => {
            updatesCompleted++;
            if (updatesCompleted === totalUpdates) {
              this.successMessage = 'User permissions updated successfully!';
              setTimeout(() => this.router.navigate(['/admin/users']), 2000);
            }
          },
          error: (error) => {
            console.error(`Failed to update ${module} permissions:`, error);
            this.errorMessage = `Failed to update permissions for ${this.getModuleDisplayName(module)}`;
            updatesCompleted++;
          }
        });
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/admin/users']);
  }
}
