import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LaborUnitsService {
  private readonly STORAGE_KEY = 'labor_budget_units';
  private readonly defaultUnits = ['Firewall', 'Access Point', 'Switch'];
  private unitsSubject = new BehaviorSubject<string[]>([]);
  units$ = this.unitsSubject.asObservable();

  constructor() {
    this.loadUnits();
  }

  private loadUnits(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as string[];
        this.saveUnits(this.normalizeUnits(parsed));
        return;
      } catch (error) {
        console.error('Error loading labor units:', error);
      }
    }
    this.saveUnits(this.defaultUnits);
  }

  private normalizeUnits(units: string[]): string[] {
    const trimmed = (units || [])
      .map(unit => (unit || '').trim())
      .filter(unit => unit.length > 0)
      .filter(unit => !['host', 'server'].includes(unit.toLowerCase()));
    const unique = Array.from(new Set(trimmed));
    return unique.length > 0 ? unique : [...this.defaultUnits];
  }

  private saveUnits(units: string[]): void {
    const normalized = this.normalizeUnits(units);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(normalized));
    this.unitsSubject.next(normalized);
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
    this.saveUnits([...current, unit]);
    return true;
  }

  deleteUnit(name: string): boolean {
    const unit = name.trim();
    const current = this.unitsSubject.value;
    if (!unit || !current.includes(unit)) return false;
    if (current.length === 1) return false;
    this.saveUnits(current.filter(item => item !== unit));
    return true;
  }

  resetUnits(): string[] {
    this.saveUnits(this.defaultUnits);
    return this.unitsSubject.value;
  }
}
