import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MenuConfigItem {
  Id?: number;
  MenuItemKey: string;
  DisplayName: string;
  ParentKey: string | null;
  IsVisible: boolean;
  IsProtected: boolean;
  SortOrder: number;
  UpdatedAt?: string;
  UpdatedBy?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class MenuConfigService {
  private http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl || 'http://localhost:3000/api';

  private menuConfigSubject = new BehaviorSubject<MenuConfigItem[]>([]);
  menuConfig$ = this.menuConfigSubject.asObservable();

  private loaded = false;

  /**
   * Load menu configuration from backend
   */
  loadMenuConfig(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/menu-config`).pipe(
      tap(response => {
        if (response?.success && response.data) {
          this.menuConfigSubject.next(response.data);
          this.loaded = true;
        }
      }),
      catchError(error => {
        console.error('Failed to load menu configuration:', error);
        return of(null);
      })
    );
  }

  /**
   * Get current menu config (from cache)
   */
  getMenuConfig(): MenuConfigItem[] {
    return this.menuConfigSubject.value;
  }

  /**
   * Check if a menu item is visible
   */
  isMenuVisible(menuItemKey: string): boolean {
    const config = this.menuConfigSubject.value;
    if (config.length === 0) {
      // Config not loaded yet, default to visible
      return true;
    }
    const item = config.find(c => c.MenuItemKey === menuItemKey);
    return item ? item.IsVisible : true; // Default visible if not found
  }

  /**
   * Check if a menu item is protected (always visible for Super Admins)
   */
  isMenuProtected(menuItemKey: string): boolean {
    const config = this.menuConfigSubject.value;
    const item = config.find(c => c.MenuItemKey === menuItemKey);
    return item ? item.IsProtected : false;
  }

  /**
   * Update a menu item's visibility
   */
  updateMenuVisibility(menuItemKey: string, isVisible: boolean, updatedBy?: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/menu-config/${menuItemKey}`, {
      IsVisible: isVisible,
      UpdatedBy: updatedBy
    }).pipe(
      tap(() => {
        // Reload after update
        this.loadMenuConfig().subscribe();
      }),
      catchError(error => {
        console.error('Failed to update menu visibility:', error);
        return of(null);
      })
    );
  }

  /**
   * Bulk update menu visibility
   */
  bulkUpdateVisibility(items: { MenuItemKey: string; IsVisible: boolean }[], updatedBy?: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/menu-config/bulk/update`, {
      items,
      UpdatedBy: updatedBy
    }).pipe(
      tap(response => {
        if (response?.success && response.data) {
          this.menuConfigSubject.next(response.data);
        }
      }),
      catchError(error => {
        console.error('Failed to bulk update menu visibility:', error);
        return of(null);
      })
    );
  }

  /**
   * Reorder a menu item (move up or down among siblings)
   */
  reorderMenuItem(menuItemKey: string, direction: 'up' | 'down'): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/menu-config/reorder`, {
      menuItemKey,
      direction
    }).pipe(
      tap(response => {
        if (response?.success && response.data) {
          this.menuConfigSubject.next(response.data);
        }
      }),
      catchError(error => {
        console.error('Failed to reorder menu item:', error);
        return of(null);
      })
    );
  }

  /**
   * Run the migration to create the table if it doesn't exist
   */
  runMigration(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/menu-config/migrate`, {}).pipe(
      tap(() => {
        this.loadMenuConfig().subscribe();
      }),
      catchError(error => {
        console.error('Failed to run menu config migration:', error);
        return of(null);
      })
    );
  }

  /**
   * Check if config has been loaded
   */
  isLoaded(): boolean {
    return this.loaded;
  }
}
