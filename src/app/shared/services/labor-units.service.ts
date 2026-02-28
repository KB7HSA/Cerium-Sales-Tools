import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class LaborUnitsService {
  private readonly STORAGE_KEY = 'labor_budget_units';
  private readonly apiUrl = (environment as any).apiUrl || 'http://localhost:3000/api';
  private readonly defaultUnits = ['Firewall', 'Access Point', 'Switch'];
  private unitsSubject = new BehaviorSubject<string[]>([]);
  private backendAvailable = true;
  units$ = this.unitsSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadFromBackend();
  }

  private loadFromBackend(): void {
    this.http.get<ApiResponse<string[]>>(`${this.apiUrl}/labor-units`).subscribe({
      next: (resp) => {
        if (resp?.success && resp.data && resp.data.length > 0) {
          this.backendAvailable = true;
          const merged = this.mergeWithLocalUnits(resp.data);
          this.unitsSubject.next(merged);
          // Clear localStorage units since we now rely on backend
          localStorage.removeItem(this.STORAGE_KEY);
        } else {
          // Backend returned empty – fall back to local + defaults
          this.backendAvailable = true;
          this.loadFromLocalStorage();
        }
      },
      error: () => {
        console.warn('[LaborUnitsService] Backend unavailable – using localStorage');
        this.backendAvailable = false;
        this.loadFromLocalStorage();
      }
    });
  }

  /** Merge backend units with any locally-stored custom units */
  private mergeWithLocalUnits(backendUnits: string[]): string[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    let localUnits: string[] = [];
    if (stored) {
      try { localUnits = JSON.parse(stored) as string[]; } catch { /* ignore */ }
    }
    const merged = Array.from(new Set([...backendUnits, ...localUnits]));
    return this.normalizeUnits(merged);
  }

  private loadFromLocalStorage(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as string[];
        this.saveLocal(this.normalizeUnits(parsed));
        return;
      } catch (error) {
        console.error('Error loading labor units:', error);
      }
    }
    this.saveLocal(this.defaultUnits);
  }

  private normalizeUnits(units: string[]): string[] {
    const trimmed = (units || [])
      .map(unit => (unit || '').trim())
      .filter(unit => unit.length > 0)
      .filter(unit => !['host', 'server'].includes(unit.toLowerCase()));
    const unique = Array.from(new Set(trimmed));
    return unique.length > 0 ? unique : [...this.defaultUnits];
  }

  private saveLocal(units: string[]): void {
    const normalized = this.normalizeUnits(units);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(normalized));
    this.unitsSubject.next(normalized);
  }

  /** Refresh units from backend (useful after adding a new labor item with a new UoM) */
  refreshUnits(): void {
    if (this.backendAvailable) {
      this.http.get<ApiResponse<string[]>>(`${this.apiUrl}/labor-units`).subscribe({
        next: (resp) => {
          if (resp?.success && resp.data) {
            const merged = this.mergeWithLocalUnits(resp.data);
            this.unitsSubject.next(merged);
          }
        }
      });
    }
  }

  getUnits(): string[] {
    return this.unitsSubject.value;
  }

  getUnits$(): Observable<string[]> {
    return this.units$;
  }

  addUnit(name: string): boolean {
    const unit = name.trim();
    if (!unit) return false;
    const current = this.unitsSubject.value;
    if (current.includes(unit)) return false;
    const updated = [...current, unit];
    const normalized = this.normalizeUnits(updated);
    this.unitsSubject.next(normalized);
    if (!this.backendAvailable) {
      this.saveLocal(normalized);
    } else {
      // Units come from actual item UoM values in the DB.
      // Store locally too so it's visible immediately in the dropdown.
      this.saveLocal(normalized);
    }
    return true;
  }

  deleteUnit(name: string): boolean {
    const unit = name.trim();
    const current = this.unitsSubject.value;
    if (!unit || !current.includes(unit)) return false;
    if (current.length === 1) return false;
    const updated = current.filter(item => item !== unit);
    const normalized = this.normalizeUnits(updated);
    this.unitsSubject.next(normalized);
    this.saveLocal(normalized);
    return true;
  }

  resetUnits(): string[] {
    this.saveLocal(this.defaultUnits);
    return this.unitsSubject.value;
  }
}
