import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

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
  createdDate: string;
  lastModified: string;
}

// Persistence layer for solution blueprints used by the wizard.
@Injectable({
  providedIn: 'root'
})
export class SolutionBlueprintService {
  // LocalStorage-backed stream of blueprints.
  private readonly STORAGE_KEY = 'labor_budget_solution_blueprints';
  private blueprintsSubject = new BehaviorSubject<SolutionBlueprint[]>([]);
  blueprints$ = this.blueprintsSubject.asObservable();

  constructor() {
    this.loadBlueprints();
  }

  // Load and normalize stored blueprints.
  private loadBlueprints(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as SolutionBlueprint[];
        this.blueprintsSubject.next(this.normalizeBlueprints(parsed));
        return;
      } catch (error) {
        console.error('Error loading solution blueprints:', error);
      }
    }
    this.saveBlueprints([]);
  }

  // Ensure defaults and numeric casting are applied to stored data.
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
      createdDate: blueprint.createdDate || new Date().toLocaleDateString(),
      lastModified: blueprint.lastModified || new Date().toLocaleDateString()
    }));
  }

  // Persist blueprint changes.
  private saveBlueprints(blueprints: SolutionBlueprint[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(blueprints));
    this.blueprintsSubject.next(blueprints);
  }

  // Public stream for blueprint list consumers.
  getBlueprints(): Observable<SolutionBlueprint[]> {
    return this.blueprints$;
  }

  // Create and store a new blueprint.
  addBlueprint(blueprint: Omit<SolutionBlueprint, 'id' | 'createdDate' | 'lastModified'>): SolutionBlueprint {
    const now = new Date().toLocaleDateString();
    const newBlueprint: SolutionBlueprint = {
      ...blueprint,
      id: this.createId('blueprint'),
      createdDate: now,
      lastModified: now
    };
    this.saveBlueprints([...this.blueprintsSubject.value, newBlueprint]);
    return newBlueprint;
  }

  // Update a blueprint by id.
  updateBlueprint(id: string, updates: Partial<SolutionBlueprint>): void {
    const blueprints = this.blueprintsSubject.value.map(blueprint =>
      blueprint.id === id
        ? { ...blueprint, ...updates, lastModified: new Date().toLocaleDateString() }
        : blueprint
    );
    this.saveBlueprints(this.normalizeBlueprints(blueprints));
  }

  // Remove a blueprint by id.
  deleteBlueprint(id: string): void {
    const blueprints = this.blueprintsSubject.value.filter(blueprint => blueprint.id !== id);
    this.saveBlueprints(blueprints);
  }

  // Generate stable client-side ids.
  private createId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
