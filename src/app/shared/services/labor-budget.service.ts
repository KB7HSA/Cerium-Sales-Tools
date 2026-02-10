import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

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

// Persistence layer for labor budget catalog items and sections.
@Injectable({
  providedIn: 'root'
})
export class LaborBudgetService {
  // LocalStorage keys and streams.
  private readonly STORAGE_KEY = 'labor_budget_items';
  private readonly SECTIONS_KEY = 'labor_budget_sections';
  private itemsSubject = new BehaviorSubject<LaborBudgetItem[]>([]);
  private sectionsSubject = new BehaviorSubject<string[]>([]);
  items$ = this.itemsSubject.asObservable();
  sections$ = this.sectionsSubject.asObservable();

  constructor() {
    this.loadSections();
    this.loadItems();
    this.syncSectionsWithItems(this.itemsSubject.value);
  }

  // Load section list, falling back to defaults.
  private loadSections(): void {
    const stored = localStorage.getItem(this.SECTIONS_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as string[];
        this.saveSections(this.normalizeSections(parsed));
        return;
      } catch (error) {
        console.error('Error loading labor budget sections:', error);
      }
    }
    this.saveSections(['General']);
  }

  // Load catalog items, falling back to defaults.
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

  // Normalize and coerce stored items.
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

  // Normalize section list and ensure General exists.
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

  // Seed defaults for a fresh workspace.
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
    this.saveItems(defaults);
  }

  // Persist catalog changes and sync sections.
  private saveItems(items: LaborBudgetItem[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
    this.itemsSubject.next(items);
    this.syncSectionsWithItems(items);
  }

  // Persist section changes.
  private saveSections(sections: string[]): void {
    const normalized = this.normalizeSections(sections);
    localStorage.setItem(this.SECTIONS_KEY, JSON.stringify(normalized));
    this.sectionsSubject.next(normalized);
  }

  // Keep section list aligned with item data.
  private syncSectionsWithItems(items: LaborBudgetItem[]): void {
    const current = this.sectionsSubject.value;
    const fromItems = Array.from(new Set(items.map(item => item.section || 'General')));
    const merged = this.normalizeSections([...current, ...fromItems]);
    if (merged.join('|') !== current.join('|')) {
      this.saveSections(merged);
    }
  }

  // Public streams for catalog items and sections.
  getItems(): Observable<LaborBudgetItem[]> {
    return this.items$;
  }

  getSections(): Observable<string[]> {
    return this.sections$;
  }

  // Section CRUD helpers.
  addSection(sectionName: string): boolean {
    const name = sectionName.trim();
    if (!name) return false;
    const current = this.sectionsSubject.value;
    if (current.includes(name)) return false;
    this.saveSections([...current, name]);
    return true;
  }

  deleteSection(sectionName: string): boolean {
    const name = sectionName.trim();
    if (!name || name === 'General') return false;
    const current = this.sectionsSubject.value;
    if (!current.includes(name)) return false;

    const updatedSections = current.filter(section => section !== name);
    const updatedItems = this.itemsSubject.value.map(item =>
      item.section === name ? { ...item, section: 'General' } : item
    );

    this.saveItems(updatedItems);
    this.saveSections(updatedSections);
    return true;
  }

  // Catalog CRUD helpers.
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
