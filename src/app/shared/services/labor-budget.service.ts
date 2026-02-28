import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LaborBudgetItem {
  id: string;
  name: string;
  hoursPerSwitch: number;
  ratePerHour: number;
  unitPrice: number;
  unitOfMeasure: string;
  section: string;
  referenceArchitecture: ReferenceArchitectureTag;
  description?: string;
  tooltip?: string;
}

export type ReferenceArchitectureTag =
  | 'Enterprise Networking'
  | 'Data Center'
  | 'Security'
  | 'Collaboration'
  | 'Contact Center';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

/**
 * Persistence layer for labor budget catalog items and sections.
 * Stores data in the backend database via REST API.
 * Falls back to localStorage when the backend is unavailable.
 */
@Injectable({
  providedIn: 'root'
})
export class LaborBudgetService {
  private readonly STORAGE_KEY = 'labor_budget_items';
  private readonly SECTIONS_KEY = 'labor_budget_sections';
  private readonly apiUrl = (environment as any).apiUrl || 'http://localhost:3000/api';
  private itemsSubject = new BehaviorSubject<LaborBudgetItem[]>([]);
  private sectionsSubject = new BehaviorSubject<string[]>([]);
  private backendAvailable = true;
  items$ = this.itemsSubject.asObservable();
  sections$ = this.sectionsSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadFromBackend();
  }

  // ─── Data loading ────────────────────────────────────

  private loadFromBackend(): void {
    this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/labor-items`).subscribe({
      next: (resp) => {
        if (resp?.success && resp.data) {
          const mapped = resp.data.map(item => this.mapFromBackend(item));
          this.itemsSubject.next(mapped);
          this.backendAvailable = true;
          this.syncSectionsFromItems(mapped);
          // Migrate localStorage items to backend if needed
          this.migrateLocalStorageToBackend(mapped);
        }
      },
      error: () => {
        console.warn('[LaborBudgetService] Backend unavailable – using localStorage');
        this.backendAvailable = false;
        this.loadItemsFromLocalStorage();
        this.loadSectionsFromLocalStorage();
      }
    });
  }

  /** One-time migration: push localStorage items to the backend */
  private migrateLocalStorageToBackend(existing: LaborBudgetItem[]): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return;
    try {
      const local = JSON.parse(stored) as LaborBudgetItem[];
      if (!local || local.length === 0) return;
      // Only migrate items whose name doesn't already exist in backend
      const existingNames = new Set(existing.map(item => item.name.toLowerCase()));
      const toMigrate = local.filter(item => !existingNames.has(item.name.toLowerCase()));
      for (const item of toMigrate) {
        this.http.post<ApiResponse<any>>(`${this.apiUrl}/labor-items`, this.mapToBackend(item))
          .subscribe({ error: () => {} });
      }
      if (toMigrate.length > 0) {
        setTimeout(() => this.refreshFromBackend(), 2000);
      }
      // Clear localStorage after migration
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.SECTIONS_KEY);
    } catch { /* ignore */ }
  }

  private refreshFromBackend(): void {
    this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/labor-items`).subscribe({
      next: (resp) => {
        if (resp?.success && resp.data) {
          const mapped = resp.data.map(item => this.mapFromBackend(item));
          this.itemsSubject.next(mapped);
          this.syncSectionsFromItems(mapped);
        }
      }
    });
  }

  // ─── Backend ↔ Frontend mapping ──────────────────────

  private mapFromBackend(item: any): LaborBudgetItem {
    return {
      id: item.Id || item.id || '',
      name: item.Name || item.name || 'Labor Item',
      hoursPerSwitch: Number(item.HoursPerUnit ?? item.hoursPerSwitch ?? item.hoursPerUnit ?? 0),
      ratePerHour: Number(item.RatePerHour ?? item.ratePerHour ?? 0),
      unitPrice: Number(item.UnitPrice ?? item.unitPrice ?? 0),
      unitOfMeasure: item.UnitOfMeasure || item.unitOfMeasure || 'Switch',
      section: item.Section || item.section || 'General',
      referenceArchitecture: item.ReferenceArchitecture || item.referenceArchitecture || 'Enterprise Networking',
      description: item.Description || item.description || '',
      tooltip: item.Tooltip || item.tooltip || '',
    };
  }

  private mapToBackend(item: Partial<LaborBudgetItem>): any {
    return {
      Name: item.name || '',
      HoursPerUnit: item.hoursPerSwitch ?? 0,
      RatePerHour: item.ratePerHour ?? 0,
      UnitPrice: item.unitPrice ?? 0,
      UnitOfMeasure: item.unitOfMeasure || 'Switch',
      Section: item.section || 'General',
      ReferenceArchitecture: item.referenceArchitecture || 'Enterprise Networking',
      Description: item.description || '',
    };
  }

  // ─── Local fallback ──────────────────────────────────

  private loadItemsFromLocalStorage(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as LaborBudgetItem[];
        this.itemsSubject.next(this.normalizeItems(parsed));
        this.syncSectionsFromItems(this.itemsSubject.value);
        return;
      } catch { /* ignore */ }
    }
    this.initializeDefaults();
  }

  private loadSectionsFromLocalStorage(): void {
    const stored = localStorage.getItem(this.SECTIONS_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as string[];
        this.sectionsSubject.next(this.normalizeSections(parsed));
        return;
      } catch { /* ignore */ }
    }
    this.sectionsSubject.next(['General']);
  }

  private saveItemsLocal(items: LaborBudgetItem[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
    this.itemsSubject.next(items);
    this.syncSectionsFromItems(items);
  }

  private saveSectionsLocal(sections: string[]): void {
    const normalized = this.normalizeSections(sections);
    localStorage.setItem(this.SECTIONS_KEY, JSON.stringify(normalized));
    this.sectionsSubject.next(normalized);
  }

  // ─── Normalize helpers ───────────────────────────────

  private normalizeItems(items: LaborBudgetItem[]): LaborBudgetItem[] {
    return (items || []).map(item => ({
      id: item.id || `labor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: item.name || 'Labor Item',
      hoursPerSwitch: Number(item.hoursPerSwitch ?? 0),
      ratePerHour: Number(item.ratePerHour ?? 0),
      unitPrice: Number(item.unitPrice ?? (Number(item.hoursPerSwitch ?? 0) * Number(item.ratePerHour ?? 0))),
      unitOfMeasure: item.unitOfMeasure || 'Switch',
      section: item.section || 'General',
      referenceArchitecture: item.referenceArchitecture || 'Enterprise Networking',
      description: item.description || '',
      tooltip: item.tooltip || ''
    }));
  }

  private normalizeSections(sections: string[]): string[] {
    const trimmed = (sections || [])
      .map(section => (section || '').trim())
      .filter(section => section.length > 0);
    const unique = Array.from(new Set(trimmed));
    if (!unique.includes('General')) {
      unique.unshift('General');
    }
    return unique;
  }

  private syncSectionsFromItems(items: LaborBudgetItem[]): void {
    const current = this.sectionsSubject.value;
    const fromItems = Array.from(new Set(items.map(item => item.section || 'General')));
    const merged = this.normalizeSections([...current, ...fromItems]);
    this.sectionsSubject.next(merged);
  }

  private initializeDefaults(): void {
    const defaults: LaborBudgetItem[] = [
      {
        id: 'labor-1',
        name: 'Switch Deployment',
        hoursPerSwitch: 2,
        ratePerHour: 225,
        unitPrice: 450,
        unitOfMeasure: 'Switch',
        section: 'Switching',
        referenceArchitecture: 'Enterprise Networking',
        description: 'Number of Switches * 2 Hours * $225 per hour'
      }
    ];
    this.saveItemsLocal(defaults);
  }

  // ─── Public API ──────────────────────────────────────

  getItems(): Observable<LaborBudgetItem[]> {
    return this.items$;
  }

  getSections(): Observable<string[]> {
    return this.sections$;
  }

  addSection(sectionName: string): boolean {
    const name = sectionName.trim();
    if (!name) return false;
    const current = this.sectionsSubject.value;
    if (current.includes(name)) return false;
    const updated = [...current, name];
    this.sectionsSubject.next(this.normalizeSections(updated));
    if (!this.backendAvailable) {
      this.saveSectionsLocal(updated);
    }
    return true;
  }

  deleteSection(sectionName: string): boolean {
    const name = sectionName.trim();
    if (!name || name === 'General') return false;
    const current = this.sectionsSubject.value;
    if (!current.includes(name)) return false;

    const updatedSections = current.filter(section => section !== name);
    this.sectionsSubject.next(this.normalizeSections(updatedSections));

    // Reassign items in deleted section to General
    const currentItems = this.itemsSubject.value;
    const reassigned = currentItems.filter(item => item.section === name);
    for (const item of reassigned) {
      this.updateItem(item.id, { section: 'General' });
    }

    if (!this.backendAvailable) {
      this.saveSectionsLocal(updatedSections);
    }
    return true;
  }

  addItem(item: Omit<LaborBudgetItem, 'id'>): LaborBudgetItem {
    const tempId = `labor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newItem: LaborBudgetItem = { ...item, id: tempId };

    if (this.backendAvailable) {
      this.http.post<ApiResponse<any>>(`${this.apiUrl}/labor-items`, this.mapToBackend(newItem))
        .subscribe({
          next: (resp) => {
            if (resp?.success) this.refreshFromBackend();
          },
          error: (err) => {
            console.error('[LaborBudgetService] Failed to save item:', err);
            this.saveItemsLocal([...this.itemsSubject.value]);
          }
        });
    } else {
      this.saveItemsLocal([...this.itemsSubject.value]);
    }

    // Optimistic update
    this.itemsSubject.next([...this.itemsSubject.value, newItem]);
    this.syncSectionsFromItems(this.itemsSubject.value);
    return newItem;
  }

  updateItem(id: string, updates: Partial<LaborBudgetItem>): void {
    // Optimistic update
    const items = this.itemsSubject.value.map(item =>
      item.id === id ? { ...item, ...updates } : item
    );
    this.itemsSubject.next(items);
    this.syncSectionsFromItems(items);

    if (this.backendAvailable) {
      // Map updates to PascalCase for backend
      const backendUpdates: Record<string, any> = {};
      if (updates.name !== undefined) backendUpdates['Name'] = updates.name;
      if (updates.hoursPerSwitch !== undefined) backendUpdates['HoursPerUnit'] = updates.hoursPerSwitch;
      if (updates.ratePerHour !== undefined) backendUpdates['RatePerHour'] = updates.ratePerHour;
      if (updates.unitPrice !== undefined) backendUpdates['UnitPrice'] = updates.unitPrice;
      if (updates.unitOfMeasure !== undefined) backendUpdates['UnitOfMeasure'] = updates.unitOfMeasure;
      if (updates.section !== undefined) backendUpdates['Section'] = updates.section;
      if (updates.referenceArchitecture !== undefined) backendUpdates['ReferenceArchitecture'] = updates.referenceArchitecture;
      if (updates.description !== undefined) backendUpdates['Description'] = updates.description;

      this.http.put<ApiResponse<any>>(`${this.apiUrl}/labor-items/${id}`, backendUpdates)
        .subscribe({
          next: (resp) => {
            if (resp?.success) this.refreshFromBackend();
          },
          error: (err) => {
            console.error('[LaborBudgetService] Failed to update item:', err);
            this.saveItemsLocal(items);
          }
        });
    } else {
      this.saveItemsLocal(items);
    }
  }

  deleteItem(id: string): void {
    // Optimistic update
    const items = this.itemsSubject.value.filter(item => item.id !== id);
    this.itemsSubject.next(items);
    this.syncSectionsFromItems(items);

    if (this.backendAvailable) {
      this.http.delete<ApiResponse<any>>(`${this.apiUrl}/labor-items/${id}`)
        .subscribe({
          next: () => this.refreshFromBackend(),
          error: (err) => {
            console.error('[LaborBudgetService] Failed to delete item:', err);
            this.saveItemsLocal(items);
          }
        });
    } else {
      this.saveItemsLocal(items);
    }
  }
}
