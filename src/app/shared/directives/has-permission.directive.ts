import { Directive, Input, TemplateRef, ViewContainerRef, inject, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { RBACService, AppModule, Permission } from '../services/rbac.service';
import { AuthService } from '../services/auth.service';

/**
 * Structural directive to show/hide elements based on user permissions
 * 
 * Usage:
 * <div *hasPermission="{ module: 'labor-budget', permission: 'admin' }">
 *   Admin Only Content
 * </div>
 * 
 * Or for any permission:
 * <button *hasPermission="{ module: 'labor-budget', permission: 'edit' }">
 *   Edit
 * </button>
 * 
 * Or check for super admin:
 * <div *hasPermission="'super-admin'">
 *   Super Admin Content
 * </div>
 */
@Directive({
  selector: '[hasPermission]',
  standalone: true
})
export class HasPermissionDirective implements OnInit, OnDestroy {
  private rbacService = inject(RBACService);
  private authService = inject(AuthService);
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);
  
  private subscription?: Subscription;
  private hasView = false;

  @Input() hasPermission!: { module: AppModule; permission: Permission } | 'super-admin';

  ngOnInit(): void {
    // Subscribe to user changes to update visibility
    this.subscription = this.authService.currentUser$.subscribe(() => {
      this.updateView();
    });
    
    this.updateView();
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  private updateView(): void {
    const hasPermission = this.checkPermission();

    if (hasPermission && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!hasPermission && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }

  private checkPermission(): boolean {
    if (this.hasPermission === 'super-admin') {
      return this.rbacService.isSuperAdmin();
    }

    if (!this.hasPermission || !this.hasPermission.module || !this.hasPermission.permission) {
      return false;
    }

    return this.rbacService.hasPermission(
      this.hasPermission.module,
      this.hasPermission.permission
    );
  }
}

/**
 * Directive to show content only to module admins
 * 
 * Usage:
 * <div *isModuleAdmin="'labor-budget'">
 *   Admin Settings
 * </div>
 */
@Directive({
  selector: '[isModuleAdmin]',
  standalone: true
})
export class IsModuleAdminDirective implements OnInit, OnDestroy {
  private rbacService = inject(RBACService);
  private authService = inject(AuthService);
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);
  
  private subscription?: Subscription;
  private hasView = false;

  @Input() isModuleAdmin!: AppModule;

  ngOnInit(): void {
    this.subscription = this.authService.currentUser$.subscribe(() => {
      this.updateView();
    });
    
    this.updateView();
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  private updateView(): void {
    const isAdmin = this.rbacService.isModuleAdmin(this.isModuleAdmin);

    if (isAdmin && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!isAdmin && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}
