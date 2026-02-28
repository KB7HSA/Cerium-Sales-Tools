import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SolutionBlueprintItem {
  id: string;
  catalogItemId: string;
  quantity: number;
  hoursPerUnit: number;
  ratePerHour: number;
  catalogSnapshot?: {
    name: string;
    hoursPerSwitch: number;
    ratePerHour: number;
    unitPrice: number;
    unitOfMeasure: string;
    section: string;
    referenceArchitecture: string;
    description: string;
    tooltip: string;
  };
}

export interface SolutionBlueprint {
  id: string;
  name: string;
  description: string;
  overheadPercent: number;
  contingencyPercent: number;
  items: SolutionBlueprintItem[];
  projectManagementPercent: number;
  projectManagementHours: number;
  projectManagementRatePerHour: number;
  projectManagementNotes: string;
  adoptionHours: number;
  adoptionRatePerHour: number;
  adoptionNotes: string;
  referenceArchitecture?: string;
  createdDate: string;
  lastModified: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

/**
 * Persistence layer for solution blueprints.
 * Stores data in the backend database via REST API.
 * Falls back to localStorage when the backend is unavailable.
 */
@Injectable({
  providedIn: 'root'
})
export class SolutionBlueprintService {
  private readonly STORAGE_KEY = 'labor_budget_solution_blueprints';
  private readonly apiUrl = (environment as any).apiUrl || 'http://localhost:3000/api';
  private blueprintsSubject = new BehaviorSubject<SolutionBlueprint[]>([]);
  blueprints$ = this.blueprintsSubject.asObservable();
  private backendAvailable = true;

  constructor(private http: HttpClient) {
    this.loadBlueprints();
  }

  // ─── Data loading ────────────────────────────────────

  private loadBlueprints(): void {
    this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/solution-blueprints`).subscribe({
      next: (resp) => {
        if (resp?.success && resp.data) {
          const mapped = resp.data.map(b => this.mapFromBackend(b));
          this.blueprintsSubject.next(mapped);
          this.backendAvailable = true;
          // Sync local data to backend if it exists and backend was empty
          this.migrateLocalStorageToBackend(mapped);
        }
      },
      error: () => {
        console.warn('[SolutionBlueprintService] Backend unavailable – using localStorage');
        this.backendAvailable = false;
        this.loadFromLocalStorage();
      }
    });
  }

  private loadFromLocalStorage(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as SolutionBlueprint[];
        this.blueprintsSubject.next(this.normalizeBlueprints(parsed));
        return;
      } catch { /* ignore */ }
    }
    this.blueprintsSubject.next([]);
  }

  /** One-time migration: push localStorage blueprints to the backend */
  private migrateLocalStorageToBackend(existing: SolutionBlueprint[]): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return;
    try {
      const local = JSON.parse(stored) as SolutionBlueprint[];
      if (!local || local.length === 0) return;
      // Only migrate items that don't already exist in the backend
      const existingIds = new Set(existing.map(b => b.id));
      const toMigrate = local.filter(b => !existingIds.has(b.id));
      for (const bp of toMigrate) {
        this.http.post<ApiResponse<any>>(`${this.apiUrl}/solution-blueprints`, this.mapToBackend(bp))
          .subscribe({ error: () => {} });
      }
      if (toMigrate.length > 0) {
        // Reload after migration
        setTimeout(() => this.refreshFromBackend(), 2000);
      }
      // Clear localStorage after migration
      localStorage.removeItem(this.STORAGE_KEY);
    } catch { /* ignore */ }
  }

  private refreshFromBackend(): void {
    this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/solution-blueprints`).subscribe({
      next: (resp) => {
        if (resp?.success && resp.data) {
          this.blueprintsSubject.next(resp.data.map(b => this.mapFromBackend(b)));
        }
      }
    });
  }

  // ─── Backend ↔ Frontend mapping ──────────────────────

  private mapFromBackend(b: any): SolutionBlueprint {
    return {
      id: b.Id || b.id || '',
      name: b.Name || b.name || 'Solution Blueprint',
      description: b.Description || b.description || '',
      overheadPercent: Number(b.OverheadPercent ?? b.overheadPercent ?? 10),
      contingencyPercent: Number(b.ContingencyPercent ?? b.contingencyPercent ?? 5),
      items: (b.Items || b.items || []).map((item: any) => ({
        id: item.Id || item.id || '',
        catalogItemId: item.CatalogItemId || item.catalogItemId || '',
        quantity: Number(item.Quantity ?? item.quantity ?? 1),
        hoursPerUnit: Number(item.HoursPerUnit ?? item.hoursPerUnit ?? 0),
        ratePerHour: Number(item.RatePerHour ?? item.ratePerHour ?? 0),
        catalogSnapshot: this.parseSnapshot(item.CatalogSnapshot || item.catalogSnapshot),
      })),
      projectManagementPercent: Number(b.ProjectManagementPercent ?? b.projectManagementPercent ?? 10),
      projectManagementHours: Number(b.ProjectManagementHours ?? b.projectManagementHours ?? 0),
      projectManagementRatePerHour: Number(b.ProjectManagementRatePerHour ?? b.projectManagementRatePerHour ?? 225),
      projectManagementNotes: b.ProjectManagementNotes || b.projectManagementNotes || '',
      adoptionHours: Number(b.AdoptionHours ?? b.adoptionHours ?? 0),
      adoptionRatePerHour: Number(b.AdoptionRatePerHour ?? b.adoptionRatePerHour ?? 175),
      adoptionNotes: b.AdoptionNotes || b.adoptionNotes || '',
      referenceArchitecture: b.ReferenceArchitecture || b.referenceArchitecture || '',
      createdDate: b.CreatedDate || b.createdDate || new Date().toLocaleDateString(),
      lastModified: b.LastModified || b.lastModified || new Date().toLocaleDateString(),
    };
  }

  private parseSnapshot(val: any): SolutionBlueprintItem['catalogSnapshot'] | undefined {
    if (!val) return undefined;
    const obj = typeof val === 'string' ? JSON.parse(val) : val;
    return {
      name: obj.name || '',
      hoursPerSwitch: Number(obj.hoursPerSwitch ?? 0),
      ratePerHour: Number(obj.ratePerHour ?? 0),
      unitPrice: Number(obj.unitPrice ?? 0),
      unitOfMeasure: obj.unitOfMeasure || 'Unit',
      section: obj.section || 'General',
      referenceArchitecture: obj.referenceArchitecture || 'Enterprise Networking',
      description: obj.description || '',
      tooltip: obj.tooltip || '',
    };
  }

  private mapToBackend(bp: SolutionBlueprint | Omit<SolutionBlueprint, 'id' | 'createdDate' | 'lastModified'>): any {
    return {
      Id: (bp as any).id || undefined,
      Name: bp.name,
      Description: bp.description,
      OverheadPercent: bp.overheadPercent,
      ContingencyPercent: bp.contingencyPercent,
      ProjectManagementPercent: bp.projectManagementPercent,
      ProjectManagementHours: bp.projectManagementHours,
      ProjectManagementRatePerHour: bp.projectManagementRatePerHour,
      ProjectManagementNotes: bp.projectManagementNotes,
      AdoptionHours: bp.adoptionHours,
      AdoptionRatePerHour: bp.adoptionRatePerHour,
      AdoptionNotes: bp.adoptionNotes,
      ReferenceArchitecture: (bp as any).referenceArchitecture || null,
      IsPublic: false,
      Items: (bp.items || []).map(item => ({
        Id: item.id,
        CatalogItemId: item.catalogItemId,
        Quantity: item.quantity,
        HoursPerUnit: item.hoursPerUnit,
        RatePerHour: item.ratePerHour,
        CatalogSnapshot: item.catalogSnapshot ? JSON.stringify(item.catalogSnapshot) : null,
      })),
    };
  }

  // ─── Normalize (for localStorage fallback) ───────────

  private normalizeBlueprints(blueprints: SolutionBlueprint[]): SolutionBlueprint[] {
    return (blueprints || []).map(blueprint => ({
      id: blueprint.id || this.createId('blueprint'),
      name: blueprint.name || 'Solution Blueprint',
      description: blueprint.description || '',
      overheadPercent: Number(blueprint.overheadPercent ?? 10),
      contingencyPercent: Number(blueprint.contingencyPercent ?? 5),
      items: (blueprint.items || []).map(item => ({
        id: item.id || this.createId('blueprint-item'),
        catalogItemId: item.catalogItemId || '',
        quantity: Number(item.quantity ?? 1),
        hoursPerUnit: Number(item.hoursPerUnit ?? 0),
        ratePerHour: Number(item.ratePerHour ?? 0),
        catalogSnapshot: item.catalogSnapshot
          ? {
              name: item.catalogSnapshot.name || '',
              hoursPerSwitch: Number(item.catalogSnapshot.hoursPerSwitch ?? 0),
              ratePerHour: Number(item.catalogSnapshot.ratePerHour ?? 0),
              unitPrice: Number(item.catalogSnapshot.unitPrice ?? 0),
              unitOfMeasure: item.catalogSnapshot.unitOfMeasure || 'Unit',
              section: item.catalogSnapshot.section || 'General',
              referenceArchitecture: item.catalogSnapshot.referenceArchitecture || 'Enterprise Networking',
              description: item.catalogSnapshot.description || '',
              tooltip: item.catalogSnapshot.tooltip || ''
            }
          : undefined
      })),
      projectManagementPercent: Number(blueprint.projectManagementPercent ?? 10),
      projectManagementHours: Number(blueprint.projectManagementHours ?? 0),
      projectManagementRatePerHour: Number(blueprint.projectManagementRatePerHour ?? 225),
      projectManagementNotes: blueprint.projectManagementNotes || '',
      adoptionHours: Number(blueprint.adoptionHours ?? 0),
      adoptionRatePerHour: Number(blueprint.adoptionRatePerHour ?? 175),
      adoptionNotes: blueprint.adoptionNotes || '',
      referenceArchitecture: blueprint.referenceArchitecture || '',
      createdDate: blueprint.createdDate || new Date().toLocaleDateString(),
      lastModified: blueprint.lastModified || new Date().toLocaleDateString()
    }));
  }

  // ─── Public API (same signatures as before) ──────────

  getBlueprints(): Observable<SolutionBlueprint[]> {
    return this.blueprints$;
  }

  addBlueprint(blueprint: Omit<SolutionBlueprint, 'id' | 'createdDate' | 'lastModified'>): SolutionBlueprint {
    const now = new Date().toLocaleDateString();
    const newBlueprint: SolutionBlueprint = {
      ...blueprint,
      id: this.createId('blueprint'),
      createdDate: now,
      lastModified: now
    };

    // Optimistic update first
    this.blueprintsSubject.next([...this.blueprintsSubject.value, newBlueprint]);

    if (this.backendAvailable) {
      this.http.post<ApiResponse<any>>(`${this.apiUrl}/solution-blueprints`, this.mapToBackend(newBlueprint))
        .subscribe({
          next: (resp) => {
            if (resp?.success) this.refreshFromBackend();
          },
          error: (err) => {
            console.error('[SolutionBlueprintService] Failed to save blueprint:', err);
            // Fall back to local – subject already has the new blueprint
            this.saveBlueprintsLocal([...this.blueprintsSubject.value]);
          }
        });
    } else {
      this.saveBlueprintsLocal([...this.blueprintsSubject.value]);
    }

    return newBlueprint;
  }

  updateBlueprint(id: string, updates: Partial<SolutionBlueprint>): void {
    // Optimistic update
    const blueprints = this.blueprintsSubject.value.map(bp =>
      bp.id === id ? { ...bp, ...updates, lastModified: new Date().toLocaleDateString() } : bp
    );
    this.blueprintsSubject.next(this.normalizeBlueprints(blueprints));

    if (this.backendAvailable) {
      const merged = blueprints.find(bp => bp.id === id);
      if (merged) {
        this.http.put<ApiResponse<any>>(`${this.apiUrl}/solution-blueprints/${id}`, this.mapToBackend(merged))
          .subscribe({
            next: (resp) => {
              if (resp?.success) this.refreshFromBackend();
            },
            error: (err) => {
              console.error('[SolutionBlueprintService] Failed to update blueprint:', err);
              this.saveBlueprintsLocal(blueprints);
            }
          });
      }
    } else {
      this.saveBlueprintsLocal(blueprints);
    }
  }

  deleteBlueprint(id: string): void {
    // Optimistic update
    const blueprints = this.blueprintsSubject.value.filter(bp => bp.id !== id);
    this.blueprintsSubject.next(blueprints);

    if (this.backendAvailable) {
      this.http.delete<ApiResponse<any>>(`${this.apiUrl}/solution-blueprints/${id}`)
        .subscribe({
          next: () => this.refreshFromBackend(),
          error: (err) => {
            console.error('[SolutionBlueprintService] Failed to delete blueprint:', err);
            this.saveBlueprintsLocal(blueprints);
          }
        });
    } else {
      this.saveBlueprintsLocal(blueprints);
    }
  }

  // ─── Local fallback ──────────────────────────────────

  private saveBlueprintsLocal(blueprints: SolutionBlueprint[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(blueprints));
    this.blueprintsSubject.next(blueprints);
  }

  private createId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
