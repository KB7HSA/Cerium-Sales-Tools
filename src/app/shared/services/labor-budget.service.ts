import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface LaborBudgetItem {
  id: string;
  name: string;
  hoursPerSwitch: number;
  ratePerHour: number;
  referenceArchitecture: ReferenceArchitectureTag;
  description?: string;
}

export type ReferenceArchitectureTag =
  | 'Enterprise Networking'
  | 'Data Center'
  | 'Security'
  | 'Collaboration'
  | 'Contact Center';

@Injectable({
  providedIn: 'root'
})
export class LaborBudgetService {
  private readonly STORAGE_KEY = 'labor_budget_items';
  private itemsSubject = new BehaviorSubject<LaborBudgetItem[]>([]);
  items$ = this.itemsSubject.asObservable();

  constructor() {
    this.loadItems();
  }

  private loadItems(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as LaborBudgetItem[];
        this.itemsSubject.next(this.normalizeItems(parsed));
        return;
      } catch (error) {
        console.error('Error loading labor budget items:', error);
      }
    }
    this.initializeDefaults();
  }

  private normalizeItems(items: LaborBudgetItem[]): LaborBudgetItem[] {
    return (items || []).map(item => ({
      id: item.id || `labor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: item.name || 'Labor Item',
      hoursPerSwitch: Number(item.hoursPerSwitch ?? 0),
      ratePerHour: Number(item.ratePerHour ?? 0),
      referenceArchitecture: item.referenceArchitecture || 'Enterprise Networking',
      description: item.description || ''
    }));
  }

  private initializeDefaults(): void {
    const defaults: LaborBudgetItem[] = [
      {
        id: 'labor-1',
        name: 'Switch Deployment',
        hoursPerSwitch: 2,
        ratePerHour: 225,
        referenceArchitecture: 'Enterprise Networking',
        description: 'Number of Switches * 2 Hours * $225 per hour'
      }
    ];
    this.saveItems(defaults);
  }

  private saveItems(items: LaborBudgetItem[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
    this.itemsSubject.next(items);
  }

  getItems(): Observable<LaborBudgetItem[]> {
    return this.items$;
  }

  addItem(item: Omit<LaborBudgetItem, 'id'>): LaborBudgetItem {
    const newItem: LaborBudgetItem = {
      ...item,
      id: `labor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    const items = [...this.itemsSubject.value, newItem];
    this.saveItems(items);
    return newItem;
  }

  updateItem(id: string, updates: Partial<LaborBudgetItem>): void {
    const items = this.itemsSubject.value.map(item =>
      item.id === id ? { ...item, ...updates } : item
    );
    this.saveItems(items);
  }

  deleteItem(id: string): void {
    const items = this.itemsSubject.value.filter(item => item.id !== id);
    this.saveItems(items);
  }
}
