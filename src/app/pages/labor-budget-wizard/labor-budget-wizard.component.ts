import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  LaborBudgetWizardDraft,
  LaborBudgetWizardItem,
  LaborBudgetWizardService,
  LaborBudgetWizardSolution
} from '../../shared/services/labor-budget-wizard.service';
import { LaborBudgetItem, LaborBudgetService } from '../../shared/services/labor-budget.service';
import { Customer, CustomerManagementService } from '../../shared/services/customer-management.service';
import { LaborSolutionsService, LaborSolution } from '../../shared/services/labor-solutions.service';
import { SolutionBlueprint, SolutionBlueprintService } from '../../shared/services/solution-blueprint.service';

// Labor Budget wizard: step-by-step draft builder and handoff to calculator.
@Component({
  selector: 'app-labor-budget-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './labor-budget-wizard.component.html',
  styleUrl: './labor-budget-wizard.component.css'
})
export class LaborBudgetWizardComponent implements OnInit, OnDestroy {
  // Wizard step metadata and navigation state.
  steps = [
    { id: 'customer', label: 'Customer' },
    { id: 'solutions', label: 'Solutions' },
    { id: 'work-items', label: 'Work Items' },
    { id: 'project-management', label: 'Project Management' },
    { id: 'adoption', label: 'Adoption' },
    { id: 'review', label: 'Review' }
  ];
  currentStepIndex = 0;
  // Draft data and supporting lookup lists.
  draft: LaborBudgetWizardDraft;
  customers: Customer[] = [];
  catalogItems: LaborBudgetItem[] = [];
  blueprints: SolutionBlueprint[] = [];
  selectedBlueprintId: string = '';

  private subscription = new Subscription();
  private readonly wizardHandoffKey = 'labor_budget_wizard_handoff';

  constructor(
    private wizardService: LaborBudgetWizardService,
    private laborBudgetService: LaborBudgetService,
    private customerService: CustomerManagementService,
    private laborSolutionsService: LaborSolutionsService,
    private solutionBlueprintService: SolutionBlueprintService,
    private router: Router
  ) {
    this.draft = this.wizardService.getDraftSnapshot();
  }

  // Load draft and lookup data from services.
  ngOnInit(): void {
    this.subscription.add(
      this.wizardService.getDraft().subscribe(draft => {
        this.draft = draft;
      })
    );
    this.subscription.add(
      this.laborBudgetService.getItems().subscribe(items => {
        this.catalogItems = items;
      })
    );
    this.subscription.add(
      this.customerService.customers$.subscribe(customers => {
        this.customers = customers.filter(customer => customer.status === 'active');
      })
    );
    this.subscription.add(
      this.solutionBlueprintService.getBlueprints().subscribe(blueprints => {
        this.blueprints = blueprints;
        if (!this.selectedBlueprintId && blueprints.length > 0) {
          this.selectedBlueprintId = blueprints[0].id;
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  // Active solution used for edits and work item operations.
  get activeSolution(): LaborBudgetWizardSolution | null {
    return this.draft.solutions.find(solution => solution.id === this.draft.activeSolutionId) || null;
  }

  // Step navigation helpers.
  goToStep(index: number): void {
    if (index < 0 || index >= this.steps.length) return;
    this.currentStepIndex = index;
  }

  nextStep(): void {
    if (!this.canMoveForward) return;
    this.goToStep(this.currentStepIndex + 1);
  }

  previousStep(): void {
    this.goToStep(this.currentStepIndex - 1);
  }

  // Gate movement based on required inputs.
  get canMoveForward(): boolean {
    if (this.currentStepIndex === 0) {
      return this.draft.customerId.trim().length > 0;
    }
    return true;
  }

  // Draft persistence helpers.
  updateDraft(updates: Partial<LaborBudgetWizardDraft>): void {
    this.wizardService.updateDraft(updates);
  }

  updateDraftNumber(field: keyof LaborBudgetWizardDraft, value: string | number): void {
    this.updateDraft({ [field]: Number(value) } as Partial<LaborBudgetWizardDraft>);
  }

  resetDraft(): void {
    if (!confirm('Reset this wizard draft?')) return;
    this.wizardService.resetDraft();
    this.currentStepIndex = 0;
  }

  // Solution CRUD actions within the wizard.
  addSolution(): void {
    this.wizardService.addSolution('New Solution');
  }

  selectSolution(solutionId: string): void {
    this.wizardService.setActiveSolution(solutionId);
  }

  updateSolutionField(field: keyof LaborBudgetWizardSolution, value: string | number): void {
    if (!this.activeSolution) return;
    const updates: Partial<LaborBudgetWizardSolution> = {
      [field]: field === 'overheadPercent' || field === 'contingencyPercent'
        ? Number(value)
        : value
    } as Partial<LaborBudgetWizardSolution>;
    this.wizardService.updateSolution(this.activeSolution.id, updates);
  }

  removeSolution(solution: LaborBudgetWizardSolution): void {
    if (!confirm(`Delete solution "${solution.name}"?`)) return;
    this.wizardService.deleteSolution(solution.id);
  }

  // Work item row operations for the active solution.
  addWorkItemRow(): void {
    const solution = this.activeSolution;
    if (!solution || this.catalogItems.length === 0) return;
    const catalogItem = this.catalogItems[0];
    const item: LaborBudgetWizardItem = {
      id: this.createId('wizard-item'),
      catalogItemId: catalogItem.id,
      quantity: 1,
      hoursPerUnit: catalogItem.hoursPerSwitch,
      ratePerHour: catalogItem.ratePerHour
    };
    this.wizardService.addItem(solution.id, item);
  }

  updateWorkItemItem(item: LaborBudgetWizardItem, catalogItemId: string): void {
    const catalog = this.getCatalogItem(catalogItemId);
    if (!this.activeSolution || !catalog) return;
    this.wizardService.updateItem(this.activeSolution.id, item.id, {
      catalogItemId,
      hoursPerUnit: catalog.hoursPerSwitch,
      ratePerHour: catalog.ratePerHour
    });
  }

  updateWorkItemValue(item: LaborBudgetWizardItem, field: keyof LaborBudgetWizardItem, value: string | number): void {
    if (!this.activeSolution) return;
    this.wizardService.updateItem(this.activeSolution.id, item.id, {
      [field]: Number(value)
    } as Partial<LaborBudgetWizardItem>);
  }

  removeWorkItem(item: LaborBudgetWizardItem): void {
    if (!this.activeSolution) return;
    this.wizardService.deleteItem(this.activeSolution.id, item.id);
  }

  // Catalog lookup and pricing calculations.
  getCatalogItem(id: string): LaborBudgetItem | null {
    return this.catalogItems.find(item => item.id === id) || null;
  }

  getItemCost(item: LaborBudgetWizardItem): number {
    return item.quantity * item.hoursPerUnit * item.ratePerHour;
  }

  getSolutionSubtotal(solution: LaborBudgetWizardSolution): number {
    return solution.items.reduce((total, item) => total + this.getItemCost(item), 0);
  }

  getSolutionOverhead(solution: LaborBudgetWizardSolution): number {
    return this.getSolutionSubtotal(solution) * (solution.overheadPercent / 100);
  }

  getSolutionContingency(solution: LaborBudgetWizardSolution): number {
    return this.getSolutionSubtotal(solution) * (solution.contingencyPercent / 100);
  }

  getSolutionTotal(solution: LaborBudgetWizardSolution): number {
    return this.getSolutionSubtotal(solution) + this.getSolutionOverhead(solution) + this.getSolutionContingency(solution);
  }

  // Wizard rollups for review and cost summaries.
  get laborSubtotal(): number {
    return this.draft.solutions.reduce((total, solution) => total + this.getSolutionTotal(solution), 0);
  }

  get projectManagementCost(): number {
    const percentCost = this.laborSubtotal * (this.draft.projectManagementPercent / 100);
    const hourCost = this.draft.projectManagementHours * this.draft.projectManagementRatePerHour;
    return percentCost + hourCost;
  }

  get adoptionCost(): number {
    return this.draft.adoptionHours * this.draft.adoptionRatePerHour;
  }

  get grandTotal(): number {
    return this.laborSubtotal + this.projectManagementCost + this.adoptionCost;
  }

  // Finalize and hand off the draft to the calculator.
  sendToCalculator(): void {
    const solutions = this.draft.solutions.map(solution => this.mapSolution(solution));
    this.laborSolutionsService.replaceSolutions(solutions);
    localStorage.setItem(this.wizardHandoffKey, JSON.stringify({
      customerId: this.draft.customerId,
      notes: this.buildCalculatorNotes(),
      selectedSolutionId: this.draft.activeSolutionId
    }));
    this.router.navigate(['/labor-budget']);
  }

  // Import blueprint templates into the wizard draft.
  importBlueprint(): void {
    const blueprint = this.blueprints.find(entry => entry.id === this.selectedBlueprintId);
    if (!blueprint) return;
    const catalogIds = new Map(this.catalogItems.map(item => [item.id, item]));
    const solution = this.wizardService.addSolution(blueprint.name);
    this.wizardService.updateSolution(solution.id, {
      name: blueprint.name,
      description: blueprint.description,
      overheadPercent: blueprint.overheadPercent,
      contingencyPercent: blueprint.contingencyPercent,
      items: blueprint.items.map(item => {
        const catalogId = this.resolveCatalogItemId(item, catalogIds);
        return {
          id: this.createId('wizard-item'),
          catalogItemId: catalogId,
          quantity: item.quantity,
          hoursPerUnit: item.hoursPerUnit,
          ratePerHour: item.ratePerHour
        };
      })
    });
    this.wizardService.updateDraft({
      projectManagementPercent: blueprint.projectManagementPercent,
      projectManagementHours: blueprint.projectManagementHours,
      projectManagementRatePerHour: blueprint.projectManagementRatePerHour,
      projectManagementNotes: blueprint.projectManagementNotes,
      adoptionHours: blueprint.adoptionHours,
      adoptionRatePerHour: blueprint.adoptionRatePerHour,
      adoptionNotes: blueprint.adoptionNotes
    });
  }

  // Utility helpers for IDs and mappings.
  private createId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private resolveCatalogItemId(
    item: SolutionBlueprint['items'][number],
    catalogLookup: Map<string, LaborBudgetItem>
  ): string {
    if (catalogLookup.has(item.catalogItemId)) {
      return item.catalogItemId;
    }

    const snapshot = item.catalogSnapshot;
    if (!snapshot) {
      return this.catalogItems[0]?.id || item.catalogItemId;
    }

    const created = this.laborBudgetService.addItem({
      name: snapshot.name || 'Blueprint Item',
      hoursPerSwitch: snapshot.hoursPerSwitch,
      ratePerHour: snapshot.ratePerHour,
      unitPrice: snapshot.unitPrice || (snapshot.hoursPerSwitch * snapshot.ratePerHour),
      unitOfMeasure: snapshot.unitOfMeasure || 'Unit',
      section: snapshot.section || 'General',
      referenceArchitecture: snapshot.referenceArchitecture as any,
      description: snapshot.description || '',
      tooltip: snapshot.tooltip || ''
    });

    this.catalogItems = [...this.catalogItems, created];
    catalogLookup.set(created.id, created);
    return created.id;
  }

  private mapSolution(solution: LaborBudgetWizardSolution): LaborSolution {
    const now = new Date().toLocaleDateString();
    return {
      id: solution.id,
      name: solution.name,
      description: solution.description,
      overheadPercent: Number(solution.overheadPercent),
      contingencyPercent: Number(solution.contingencyPercent),
      items: solution.items.map(item => ({
        id: item.id,
        catalogItemId: item.catalogItemId,
        quantity: Number(item.quantity),
        hoursPerUnit: Number(item.hoursPerUnit),
        ratePerHour: Number(item.ratePerHour)
      })),
      createdDate: now,
      lastModified: now
    };
  }

  private buildCalculatorNotes(): string {
    const parts: string[] = [];
    const jobName = this.draft.jobName.trim();
    const notes = this.draft.notes.trim();

    if (jobName) {
      parts.push(`Job: ${jobName}`);
    }
    if (notes) {
      parts.push(notes);
    }
    if (this.draft.projectManagementPercent || this.draft.projectManagementHours) {
      parts.push(
        `PM: ${this.draft.projectManagementPercent}% + ${this.draft.projectManagementHours}h @ ${this.draft.projectManagementRatePerHour}`
      );
    }
    if (this.draft.adoptionHours) {
      parts.push(`Adoption: ${this.draft.adoptionHours}h @ ${this.draft.adoptionRatePerHour}`);
    }

    return parts.join(' | ');
  }
}
