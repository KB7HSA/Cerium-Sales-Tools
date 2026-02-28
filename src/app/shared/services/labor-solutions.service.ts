import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LaborSolutionItem {
  id: string;
  catalogItemId: string;
  quantity: number;
  hoursPerUnit: number;
  ratePerHour: number;
  groupName?: string;
  sortOrder?: number;
}

export interface LaborSolution {
  id: string;
  name: string;
  description?: string;
  overheadPercent: number;
  contingencyPercent: number;
  items: LaborSolutionItem[];
  createdDate: string;
  lastModified: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

/**
 * Persistence layer for labor solutions (budget line-item groupings).
 * Stores data in the backend database via REST API.
 * Falls back to localStorage when the backend is unavailable.
 */
@Injectable({
  providedIn: 'root'
})
export class LaborSolutionsService {
  private readonly STORAGE_KEY = 'labor_budget_solutions';
  private readonly apiUrl = (environment as any).apiUrl || 'http://localhost:3000/api';
  private solutionsSubject = new BehaviorSubject<LaborSolution[]>([]);
  solutions$ = this.solutionsSubject.asObservable();
  private backendAvailable = true;

  constructor(private http: HttpClient) {
    this.loadSolutions();
  }

  // ─── Data loading ────────────────────────────────────

  private loadSolutions(): void {
    this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/labor-solutions`).subscribe({
      next: (resp) => {
        if (resp?.success && resp.data) {
          const mapped = resp.data.map(s => this.mapFromBackend(s));
          this.backendAvailable = true;
          if (mapped.length > 0) {
            this.solutionsSubject.next(mapped);
          } else {
            // Check localStorage for migration
            this.migrateLocalStorageToBackend();
          }
        }
      },
      error: () => {
        console.warn('[LaborSolutionsService] Backend unavailable – using localStorage');
        this.backendAvailable = false;
        this.loadFromLocalStorage();
      }
    });
  }

  private loadFromLocalStorage(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as LaborSolution[];
        this.solutionsSubject.next(this.normalizeSolutions(parsed));
        return;
      } catch { /* ignore */ }
    }
    this.initializeDefaults();
  }

  private migrateLocalStorageToBackend(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) {
      this.initializeDefaults();
      return;
    }
    try {
      const local = JSON.parse(stored) as LaborSolution[];
      if (!local || local.length === 0) {
        this.initializeDefaults();
        return;
      }
      // Push all local solutions to backend
      const backendPayloads = local.map(s => this.mapToBackend(s));
      this.http.put<ApiResponse<any[]>>(`${this.apiUrl}/labor-solutions-bulk`, { solutions: backendPayloads })
        .subscribe({
          next: (resp) => {
            if (resp?.success && resp.data) {
              this.solutionsSubject.next(resp.data.map(s => this.mapFromBackend(s)));
              localStorage.removeItem(this.STORAGE_KEY);
            }
          },
          error: () => {
            // Fall back to local data
            this.solutionsSubject.next(this.normalizeSolutions(local));
          }
        });
    } catch {
      this.initializeDefaults();
    }
  }

  private initializeDefaults(): void {
    const now = new Date().toLocaleDateString();
    const defaults: LaborSolution[] = [{
      id: 'solution-1',
      name: 'Solution 1',
      description: '',
      overheadPercent: 10,
      contingencyPercent: 5,
      items: [],
      createdDate: now,
      lastModified: now
    }];
    this.solutionsSubject.next(defaults);
  }

  private refreshFromBackend(): void {
    this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/labor-solutions`).subscribe({
      next: (resp) => {
        if (resp?.success && resp.data) {
          this.solutionsSubject.next(resp.data.map(s => this.mapFromBackend(s)));
        }
      }
    });
  }

  // ─── Backend ↔ Frontend mapping ──────────────────────

  private mapFromBackend(s: any): LaborSolution {
    return {
      id: s.Id || s.id || '',
      name: s.Name || s.name || 'Solution',
      description: s.Description || s.description || '',
      overheadPercent: Number(s.OverheadPercent ?? s.overheadPercent ?? 10),
      contingencyPercent: Number(s.ContingencyPercent ?? s.contingencyPercent ?? 5),
      items: (s.Items || s.items || []).map((item: any, index: number) => ({
        id: item.Id || item.id || '',
        catalogItemId: item.CatalogItemId || item.catalogItemId || '',
        quantity: Number(item.Quantity ?? item.quantity ?? 1),
        hoursPerUnit: Number(item.HoursPerUnit ?? item.hoursPerUnit ?? 0),
        ratePerHour: Number(item.RatePerHour ?? item.ratePerHour ?? 0),
        groupName: item.GroupName || item.groupName || 'Default',
        sortOrder: Number(item.SortOrder ?? item.sortOrder ?? index),
      })),
      createdDate: s.CreatedDate || s.createdDate || new Date().toLocaleDateString(),
      lastModified: s.LastModified || s.lastModified || new Date().toLocaleDateString(),
    };
  }

  private mapToBackend(sol: LaborSolution): any {
    return {
      Id: sol.id,
      Name: sol.name,
      Description: sol.description,
      OverheadPercent: sol.overheadPercent,
      ContingencyPercent: sol.contingencyPercent,
      Items: (sol.items || []).map(item => ({
        Id: item.id,
        CatalogItemId: item.catalogItemId,
        Quantity: item.quantity,
        HoursPerUnit: item.hoursPerUnit,
        RatePerHour: item.ratePerHour,
        GroupName: item.groupName || 'Default',
        SortOrder: item.sortOrder ?? 0,
      })),
    };
  }

  // ─── Normalize (for localStorage fallback) ───────────

  private normalizeSolutions(solutions: LaborSolution[]): LaborSolution[] {
    return (solutions || []).map(solution => ({
      id: solution.id || `solution-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: solution.name || 'Solution',
      description: solution.description || '',
      overheadPercent: Number(solution.overheadPercent ?? 10),
      contingencyPercent: Number(solution.contingencyPercent ?? 5),
      items: (solution.items || []).map((item, index) => ({
        id: item.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        catalogItemId: item.catalogItemId || '',
        quantity: Number(item.quantity ?? 1),
        hoursPerUnit: Number(item.hoursPerUnit ?? 0),
        ratePerHour: Number(item.ratePerHour ?? 0),
        groupName: item.groupName || 'Default',
        sortOrder: Number(item.sortOrder ?? index)
      })),
      createdDate: solution.createdDate || new Date().toLocaleDateString(),
      lastModified: solution.lastModified || new Date().toLocaleDateString()
    }));
  }

  // ─── Local fallback ──────────────────────────────────

  private saveSolutionsLocal(solutions: LaborSolution[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(solutions));
    this.solutionsSubject.next(solutions);
  }

  // ─── Public API (same signatures as before) ──────────

  getSolutions(): Observable<LaborSolution[]> {
    return this.solutions$;
  }

  addSolution(name: string): LaborSolution {
    const now = new Date().toLocaleDateString();
    const solution: LaborSolution = {
      id: `solution-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim() || 'New Solution',
      description: '',
      overheadPercent: 10,
      contingencyPercent: 5,
      items: [],
      createdDate: now,
      lastModified: now
    };

    // Optimistic update
    this.solutionsSubject.next([...this.solutionsSubject.value, solution]);

    if (this.backendAvailable) {
      this.http.post<ApiResponse<any>>(`${this.apiUrl}/labor-solutions`, this.mapToBackend(solution))
        .subscribe({
          next: () => this.refreshFromBackend(),
          error: () => this.saveSolutionsLocal([...this.solutionsSubject.value])
        });
    } else {
      this.saveSolutionsLocal([...this.solutionsSubject.value]);
    }

    return solution;
  }

  updateSolution(id: string, updates: Partial<LaborSolution>): void {
    const solutions = this.solutionsSubject.value.map(s =>
      s.id === id ? { ...s, ...updates, lastModified: new Date().toLocaleDateString() } : s
    );
    this.solutionsSubject.next(solutions);

    if (this.backendAvailable) {
      const merged = solutions.find(s => s.id === id);
      if (merged) {
        this.http.put<ApiResponse<any>>(`${this.apiUrl}/labor-solutions/${id}`, this.mapToBackend(merged))
          .subscribe({
            next: () => this.refreshFromBackend(),
            error: () => this.saveSolutionsLocal(solutions)
          });
      }
    } else {
      this.saveSolutionsLocal(solutions);
    }
  }

  deleteSolution(id: string): void {
    const solutions = this.solutionsSubject.value.filter(s => s.id !== id);
    this.solutionsSubject.next(solutions);

    if (this.backendAvailable) {
      this.http.delete<ApiResponse<any>>(`${this.apiUrl}/labor-solutions/${id}`)
        .subscribe({
          next: () => this.refreshFromBackend(),
          error: () => this.saveSolutionsLocal(solutions)
        });
    } else {
      this.saveSolutionsLocal(solutions);
    }
  }

  replaceSolutions(solutions: LaborSolution[]): void {
    const normalized = this.normalizeSolutions(solutions);
    this.solutionsSubject.next(normalized);

    if (this.backendAvailable) {
      const backendPayloads = normalized.map(s => this.mapToBackend(s));
      this.http.put<ApiResponse<any[]>>(`${this.apiUrl}/labor-solutions-bulk`, { solutions: backendPayloads })
        .subscribe({
          next: () => this.refreshFromBackend(),
          error: () => this.saveSolutionsLocal(normalized)
        });
    } else {
      this.saveSolutionsLocal(normalized);
    }
  }
}
