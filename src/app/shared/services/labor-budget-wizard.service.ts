import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface LaborBudgetWizardItem {
  id: string;
  catalogItemId: string;
  quantity: number;
  hoursPerUnit: number;
  ratePerHour: number;
}

export interface LaborBudgetWizardSolution {
  id: string;
  name: string;
  description: string;
  overheadPercent: number;
  contingencyPercent: number;
  items: LaborBudgetWizardItem[];
}

export interface LaborBudgetWizardDraft {
  id: string;
  customerId: string;
  jobName: string;
  notes: string;
  solutions: LaborBudgetWizardSolution[];
  activeSolutionId: string;
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

@Injectable({
  providedIn: 'root'
})
export class LaborBudgetWizardService {
  private readonly STORAGE_KEY = 'labor_budget_wizard_draft';
  private draftSubject = new BehaviorSubject<LaborBudgetWizardDraft>(this.loadDraft());
  draft$ = this.draftSubject.asObservable();

  private loadDraft(): LaborBudgetWizardDraft {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Partial<LaborBudgetWizardDraft>;
        return this.normalizeDraft(parsed);
      } catch (error) {
        console.error('Error loading labor budget wizard draft:', error);
      }
    }
    return this.createDefaultDraft();
  }

  private createDefaultDraft(): LaborBudgetWizardDraft {
    const now = new Date().toLocaleDateString();
    const solutionId = this.createId('wizard-solution');
    return {
      id: this.createId('wizard-draft'),
      customerId: '',
      jobName: '',
      notes: '',
      solutions: [
        {
          id: solutionId,
          name: 'Solution 1',
          description: '',
          overheadPercent: 10,
          contingencyPercent: 5,
          items: []
        }
      ],
      activeSolutionId: solutionId,
      projectManagementPercent: 10,
      projectManagementHours: 0,
      projectManagementRatePerHour: 225,
      projectManagementNotes: '',
      adoptionHours: 0,
      adoptionRatePerHour: 175,
      adoptionNotes: '',
      createdDate: now,
      lastModified: now
    };
  }

  private normalizeDraft(draft: Partial<LaborBudgetWizardDraft>): LaborBudgetWizardDraft {
    const now = new Date().toLocaleDateString();
    const normalizedSolutions = (draft.solutions || []).map(solution => ({
      id: solution.id || this.createId('wizard-solution'),
      name: solution.name || 'Solution',
      description: solution.description || '',
      overheadPercent: Number(solution.overheadPercent ?? 10),
      contingencyPercent: Number(solution.contingencyPercent ?? 5),
      items: (solution.items || []).map(item => ({
        id: item.id || this.createId('wizard-item'),
        catalogItemId: item.catalogItemId || '',
        quantity: Number(item.quantity ?? 1),
        hoursPerUnit: Number(item.hoursPerUnit ?? 0),
        ratePerHour: Number(item.ratePerHour ?? 0)
      }))
    }));

    const solutions = normalizedSolutions.length > 0
      ? normalizedSolutions
      : this.createDefaultDraft().solutions;

    const activeSolutionId = solutions.some(solution => solution.id === draft.activeSolutionId)
      ? (draft.activeSolutionId as string)
      : solutions[0].id;

    return {
      id: draft.id || this.createId('wizard-draft'),
      customerId: draft.customerId || '',
      jobName: draft.jobName || '',
      notes: draft.notes || '',
      solutions,
      activeSolutionId,
      projectManagementPercent: Number(draft.projectManagementPercent ?? 10),
      projectManagementHours: Number(draft.projectManagementHours ?? 0),
      projectManagementRatePerHour: Number(draft.projectManagementRatePerHour ?? 225),
      projectManagementNotes: draft.projectManagementNotes || '',
      adoptionHours: Number(draft.adoptionHours ?? 0),
      adoptionRatePerHour: Number(draft.adoptionRatePerHour ?? 175),
      adoptionNotes: draft.adoptionNotes || '',
      createdDate: draft.createdDate || now,
      lastModified: draft.lastModified || now
    };
  }

  private saveDraft(draft: LaborBudgetWizardDraft): void {
    const updated = { ...draft, lastModified: new Date().toLocaleDateString() };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
    this.draftSubject.next(updated);
  }

  getDraft(): Observable<LaborBudgetWizardDraft> {
    return this.draft$;
  }

  getDraftSnapshot(): LaborBudgetWizardDraft {
    return this.draftSubject.value;
  }

  updateDraft(updates: Partial<LaborBudgetWizardDraft>): void {
    this.saveDraft({ ...this.draftSubject.value, ...updates });
  }

  resetDraft(): void {
    this.saveDraft(this.createDefaultDraft());
  }

  setActiveSolution(id: string): void {
    this.updateDraft({ activeSolutionId: id });
  }

  addSolution(name: string): LaborBudgetWizardSolution {
    const solution: LaborBudgetWizardSolution = {
      id: this.createId('wizard-solution'),
      name: name.trim() || 'New Solution',
      description: '',
      overheadPercent: 10,
      contingencyPercent: 5,
      items: []
    };
    const draft = this.draftSubject.value;
    this.saveDraft({
      ...draft,
      solutions: [...draft.solutions, solution],
      activeSolutionId: solution.id
    });
    return solution;
  }

  updateSolution(id: string, updates: Partial<LaborBudgetWizardSolution>): void {
    const draft = this.draftSubject.value;
    const solutions = draft.solutions.map(solution =>
      solution.id === id ? { ...solution, ...updates } : solution
    );
    this.saveDraft({ ...draft, solutions });
  }

  deleteSolution(id: string): void {
    const draft = this.draftSubject.value;
    const solutions = draft.solutions.filter(solution => solution.id !== id);
    const nextSolutions = solutions.length > 0 ? solutions : this.createDefaultDraft().solutions;
    const activeSolutionId = nextSolutions.some(solution => solution.id === draft.activeSolutionId)
      ? draft.activeSolutionId
      : nextSolutions[0].id;
    this.saveDraft({ ...draft, solutions: nextSolutions, activeSolutionId });
  }

  addItem(solutionId: string, item: LaborBudgetWizardItem): void {
    const draft = this.draftSubject.value;
    const solutions = draft.solutions.map(solution =>
      solution.id === solutionId
        ? { ...solution, items: [...solution.items, item] }
        : solution
    );
    this.saveDraft({ ...draft, solutions });
  }

  updateItem(solutionId: string, itemId: string, updates: Partial<LaborBudgetWizardItem>): void {
    const draft = this.draftSubject.value;
    const solutions = draft.solutions.map(solution =>
      solution.id === solutionId
        ? {
            ...solution,
            items: solution.items.map(item =>
              item.id === itemId ? { ...item, ...updates } : item
            )
          }
        : solution
    );
    this.saveDraft({ ...draft, solutions });
  }

  deleteItem(solutionId: string, itemId: string): void {
    const draft = this.draftSubject.value;
    const solutions = draft.solutions.map(solution =>
      solution.id === solutionId
        ? { ...solution, items: solution.items.filter(item => item.id !== itemId) }
        : solution
    );
    this.saveDraft({ ...draft, solutions });
  }

  private createId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
