import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface LaborSolutionItem {
  id: string;
  catalogItemId: string;
  quantity: number;
  hoursPerUnit: number;
  ratePerHour: number;
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

@Injectable({
  providedIn: 'root'
})
export class LaborSolutionsService {
  private readonly STORAGE_KEY = 'labor_budget_solutions';
  private solutionsSubject = new BehaviorSubject<LaborSolution[]>([]);
  solutions$ = this.solutionsSubject.asObservable();

  constructor() {
    this.loadSolutions();
  }

  private loadSolutions(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as LaborSolution[];
        this.solutionsSubject.next(this.normalizeSolutions(parsed));
        return;
      } catch (error) {
        console.error('Error loading labor solutions:', error);
      }
    }
    this.initializeDefaults();
  }

  private normalizeSolutions(solutions: LaborSolution[]): LaborSolution[] {
    return (solutions || []).map(solution => ({
      id: solution.id || `solution-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: solution.name || 'Solution',
      description: solution.description || '',
      overheadPercent: Number(solution.overheadPercent ?? 10),
      contingencyPercent: Number(solution.contingencyPercent ?? 5),
      items: (solution.items || []).map(item => ({
        id: item.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        catalogItemId: item.catalogItemId || '',
        quantity: Number(item.quantity ?? 1),
        hoursPerUnit: Number(item.hoursPerUnit ?? 0),
        ratePerHour: Number(item.ratePerHour ?? 0)
      })),
      createdDate: solution.createdDate || new Date().toLocaleDateString(),
      lastModified: solution.lastModified || new Date().toLocaleDateString()
    }));
  }

  private initializeDefaults(): void {
    const now = new Date().toLocaleDateString();
    const defaults: LaborSolution[] = [
      {
        id: 'solution-1',
        name: 'Solution 1',
        description: '',
        overheadPercent: 10,
        contingencyPercent: 5,
        items: [],
        createdDate: now,
        lastModified: now
      }
    ];
    this.saveSolutions(defaults);
  }

  private saveSolutions(solutions: LaborSolution[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(solutions));
    this.solutionsSubject.next(solutions);
  }

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
    const solutions = [...this.solutionsSubject.value, solution];
    this.saveSolutions(solutions);
    return solution;
  }

  updateSolution(id: string, updates: Partial<LaborSolution>): void {
    const solutions = this.solutionsSubject.value.map(solution =>
      solution.id === id
        ? { ...solution, ...updates, lastModified: new Date().toLocaleDateString() }
        : solution
    );
    this.saveSolutions(solutions);
  }

  deleteSolution(id: string): void {
    const solutions = this.solutionsSubject.value.filter(solution => solution.id !== id);
    this.saveSolutions(solutions);
  }

  replaceSolutions(solutions: LaborSolution[]): void {
    this.saveSolutions(this.normalizeSolutions(solutions));
  }
}
