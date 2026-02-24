import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MenuConfigService, MenuConfigItem } from '../../shared/services/menu-config.service';
import { AuthService } from '../../shared/services/auth.service';
import { RBACService } from '../../shared/services/rbac.service';

@Component({
  selector: 'app-menu-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './menu-admin.component.html',
  styleUrls: ['./menu-admin.component.css']
})
export class MenuAdminComponent implements OnInit {
  private menuConfigService = inject(MenuConfigService);
  private authService = inject(AuthService);
  private rbacService = inject(RBACService);

  menuItems: MenuConfigItem[] = [];
  parentItems: MenuConfigItem[] = [];
  childrenMap: { [parentKey: string]: MenuConfigItem[] } = {};
  standaloneItems: MenuConfigItem[] = [];
  reordering = false;

  loading = true;
  saving = false;
  successMessage = '';
  errorMessage = '';
  migrationNeeded = false;

  ngOnInit(): void {
    this.loadMenuConfig();
  }

  loadMenuConfig(): void {
    this.loading = true;
    this.menuConfigService.loadMenuConfig().subscribe({
      next: (response) => {
        if (response?.success && response.data) {
          this.menuItems = response.data;
          this.organizeItems();
          this.loading = false;
        } else {
          // Table may not exist yet
          this.migrationNeeded = true;
          this.loading = false;
        }
      },
      error: () => {
        this.migrationNeeded = true;
        this.loading = false;
      }
    });
  }

  organizeItems(): void {
    this.parentItems = this.menuItems
      .filter(m => !m.ParentKey)
      .sort((a, b) => a.SortOrder - b.SortOrder);
    this.childrenMap = {};
    this.standaloneItems = [];

    for (const item of this.parentItems) {
      const children = this.menuItems
        .filter(m => m.ParentKey === item.MenuItemKey)
        .sort((a, b) => a.SortOrder - b.SortOrder);
      if (children.length > 0) {
        this.childrenMap[item.MenuItemKey] = children;
      } else {
        this.standaloneItems.push(item);
      }
    }
  }

  getParentsWithChildren(): MenuConfigItem[] {
    return this.parentItems.filter(p => this.childrenMap[p.MenuItemKey]?.length > 0);
  }

  getStandaloneItems(): MenuConfigItem[] {
    return this.parentItems.filter(p => !this.childrenMap[p.MenuItemKey]?.length);
  }

  toggleVisibility(item: MenuConfigItem): void {
    if (item.IsProtected) {
      return; // Protected items can't be toggled
    }

    this.saving = true;
    this.successMessage = '';
    this.errorMessage = '';

    const newVisibility = !item.IsVisible;
    const currentUser = this.authService.getCurrentUser();

    this.menuConfigService.updateMenuVisibility(
      item.MenuItemKey,
      newVisibility,
      currentUser?.email
    ).subscribe({
      next: (response) => {
        if (response?.success) {
          item.IsVisible = newVisibility;

          // If hiding a parent, also update children in local state
          if (!newVisibility && this.childrenMap[item.MenuItemKey]) {
            this.childrenMap[item.MenuItemKey].forEach(child => {
              if (!child.IsProtected) {
                child.IsVisible = false;
              }
            });
          }

          this.successMessage = `"${item.DisplayName}" ${newVisibility ? 'shown' : 'hidden'} successfully`;
          setTimeout(() => this.successMessage = '', 3000);
        } else {
          this.errorMessage = 'Failed to update menu item';
        }
        this.saving = false;
      },
      error: () => {
        this.errorMessage = 'Failed to update menu item';
        this.saving = false;
      }
    });
  }

  moveItem(item: MenuConfigItem, direction: 'up' | 'down'): void {
    if (this.reordering) return;
    this.reordering = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.menuConfigService.reorderMenuItem(item.MenuItemKey, direction).subscribe({
      next: (response) => {
        if (response?.success && response.data) {
          this.menuItems = response.data;
          this.organizeItems();
          this.successMessage = `"${item.DisplayName}" moved ${direction}`;
          setTimeout(() => this.successMessage = '', 2000);
        } else {
          this.errorMessage = response?.message || 'Failed to reorder';
        }
        this.reordering = false;
      },
      error: () => {
        this.errorMessage = 'Failed to reorder menu item';
        this.reordering = false;
      }
    });
  }

  isFirstParent(item: MenuConfigItem): boolean {
    const parents = this.getParentsWithChildren();
    const standalone = this.getStandaloneItems();
    const allParents = [...parents, ...standalone];
    return allParents.length > 0 && allParents[0].MenuItemKey === item.MenuItemKey;
  }

  isLastParent(item: MenuConfigItem): boolean {
    const parents = this.getParentsWithChildren();
    const standalone = this.getStandaloneItems();
    const allParents = [...parents, ...standalone];
    return allParents.length > 0 && allParents[allParents.length - 1].MenuItemKey === item.MenuItemKey;
  }

  isFirstChild(child: MenuConfigItem, parentKey: string): boolean {
    const children = this.childrenMap[parentKey];
    return children && children.length > 0 && children[0].MenuItemKey === child.MenuItemKey;
  }

  isLastChild(child: MenuConfigItem, parentKey: string): boolean {
    const children = this.childrenMap[parentKey];
    return children && children.length > 0 && children[children.length - 1].MenuItemKey === child.MenuItemKey;
  }

  runMigration(): void {
    this.loading = true;
    this.menuConfigService.runMigration().subscribe({
      next: () => {
        this.migrationNeeded = false;
        this.loadMenuConfig();
      },
      error: () => {
        this.errorMessage = 'Failed to run migration';
        this.loading = false;
      }
    });
  }

  isSuperAdmin(): boolean {
    return this.rbacService.isSuperAdmin();
  }
}
