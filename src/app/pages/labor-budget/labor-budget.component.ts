import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { LaborBudgetItem, LaborBudgetService, ReferenceArchitectureTag } from '../../shared/services/labor-budget.service';
import { LaborSolutionsService, LaborSolution, LaborSolutionItem } from '../../shared/services/labor-solutions.service';
import { LaborUnitsService } from '../../shared/services/labor-units.service';
import { Customer, CustomerManagementService } from '../../shared/services/customer-management.service';
import { QuoteService } from '../../shared/services/quote.service';

// Labor Budget calculator page: solution-based work item planning and quote creation.
@Component({
  selector: 'app-labor-budget',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './labor-budget.component.html',
  styleUrl: './labor-budget.component.css'
})
export class LaborBudgetComponent implements OnInit, OnDestroy {
  // Catalog, customer, and solution data sources.
  items: LaborBudgetItem[] = [];
  laborUnits: string[] = [];
  solutions: LaborSolution[] = [];
  selectedSolutionId: string | null = null;
  // Table layout and filtering state.
  columnWidths: number[] = [340, 160, 110, 120, 120, 130, 90];
  minColumnWidths: number[] = [240, 120, 80, 90, 90, 110, 80];
  searchTerm = '';
  sortKey: 'name' | 'role' | 'cost' = 'name';
  sortDirection: 'asc' | 'desc' = 'asc';
  // Inline edit state for solution items.
  editingItemId: string | null = null;
  editDraft: { quantity: number; hoursPerUnit: number; ratePerHour: number } | null = null;
  // Filters for catalog picker.
  referenceArchitectureFilter: 'All' | ReferenceArchitectureTag = 'All';
  unitFilter: 'All' | string = 'All';
  // Quote metadata.
  customers: Customer[] = [];
  selectedCustomerId: string = '';
  notes: string = '';
  errorMessage: string = '';
  serverNew: number = 0;
  serverUpgrade: number = 0;
  serverPhysicalInstall: number = 0;

  referenceArchitectureTags: ReferenceArchitectureTag[] = [
    'Enterprise Networking',
    'Data Center',
    'Security',
    'Collaboration',
    'Contact Center'
  ];

  // Persistence keys and deferred wizard state.
  private readonly columnStorageKey = 'labor_budget_column_widths';
  private readonly wizardHandoffKey = 'labor_budget_wizard_handoff';
  private pendingWizardCustomerId: string | null = null;
  private pendingWizardSolutionId: string | null = null;
  // Column resize tracking.
  private resizingColumnIndex: number | null = null;
  private resizeStartX = 0;
  private resizeStartWidth = 0;
  private onMouseMove = (event: MouseEvent) => this.handleResize(event);
  private onMouseUp = () => this.stopResize();

  private subscription: Subscription = new Subscription();

  constructor(
    private laborBudgetService: LaborBudgetService,
    private laborSolutionsService: LaborSolutionsService,
    private laborUnitsService: LaborUnitsService,
    private customerService: CustomerManagementService,
    private quoteService: QuoteService
  ) {}

  // Wire up subscriptions and restore any persisted UI state.
  ngOnInit(): void {
    this.loadWizardHandoff();
    this.loadColumnWidths();
    this.subscription.add(
      this.laborBudgetService.getItems().subscribe(items => {
        this.items = items;
      })
    );
    this.subscription.add(
      this.laborUnitsService.getUnits$().subscribe(units => {
        this.laborUnits = units;
      })
    );
    this.subscription.add(
      this.customerService.customers$.subscribe(customers => {
        this.customers = customers.filter(customer => customer.status === 'active');
        if (this.pendingWizardCustomerId && this.customers.some(customer => customer.id === this.pendingWizardCustomerId)) {
          this.selectedCustomerId = this.pendingWizardCustomerId;
          this.pendingWizardCustomerId = null;
        }
        if (!this.selectedCustomerId && this.customers.length > 0) {
          this.selectedCustomerId = this.customers[0].id;
        }
      })
    );
    this.subscription.add(
      this.laborSolutionsService.getSolutions().subscribe(solutions => {
        this.solutions = solutions;
        if (this.pendingWizardSolutionId && solutions.some(solution => solution.id === this.pendingWizardSolutionId)) {
          this.selectedSolutionId = this.pendingWizardSolutionId;
          this.pendingWizardSolutionId = null;
        }
        if (!this.selectedSolutionId && solutions.length > 0) {
          this.selectedSolutionId = solutions[0].id;
        }
        if (this.selectedSolutionId && !solutions.some(solution => solution.id === this.selectedSolutionId)) {
          this.selectedSolutionId = solutions[0]?.id || null;
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.stopResize();
  }

  // CSS grid column widths for the work item table.
  get gridTemplateColumns(): string {
    return this.columnWidths.map(width => `${width}px`).join(' ');
  }

  // Begin drag-resize for the work item table columns.
  startResize(event: MouseEvent, columnIndex: number): void {
    event.preventDefault();
    this.resizingColumnIndex = columnIndex;
    this.resizeStartX = event.clientX;
    this.resizeStartWidth = this.columnWidths[columnIndex];
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
  }

  // Apply column size updates during drag.
  private handleResize(event: MouseEvent): void {
    if (this.resizingColumnIndex === null) return;
    const delta = event.clientX - this.resizeStartX;
    const minWidth = this.minColumnWidths[this.resizingColumnIndex] || 80;
    const nextWidth = Math.max(minWidth, this.resizeStartWidth + delta);
    this.columnWidths[this.resizingColumnIndex] = nextWidth;
  }

  // End drag-resize and persist column widths.
  private stopResize(): void {
    if (this.resizingColumnIndex === null) return;
    this.resizingColumnIndex = null;
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
    this.saveColumnWidths();
  }

  // Restore grid column widths from localStorage.
  private loadColumnWidths(): void {
    const stored = localStorage.getItem(this.columnStorageKey);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as number[];
      if (Array.isArray(parsed) && parsed.length === this.columnWidths.length) {
        this.columnWidths = parsed.map((width, index) =>
          Math.max(this.minColumnWidths[index] || 80, Number(width) || this.columnWidths[index])
        );
      }
    } catch (error) {
      console.error('Error loading labor budget column widths:', error);
    }
  }

  // Apply wizard handoff selections before initial data subscriptions resolve.
  private loadWizardHandoff(): void {
    const stored = localStorage.getItem(this.wizardHandoffKey);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as { customerId?: string; notes?: string; selectedSolutionId?: string };
      if (parsed.customerId) {
        this.selectedCustomerId = parsed.customerId;
        this.pendingWizardCustomerId = parsed.customerId;
      }
      if (parsed.notes) {
        this.notes = parsed.notes;
      }
      if (parsed.selectedSolutionId) {
        this.pendingWizardSolutionId = parsed.selectedSolutionId;
      }
    } catch (error) {
      console.error('Error loading labor budget wizard handoff:', error);
    } finally {
      localStorage.removeItem(this.wizardHandoffKey);
    }
  }

  // Persist grid column widths for future visits.
  private saveColumnWidths(): void {
    localStorage.setItem(this.columnStorageKey, JSON.stringify(this.columnWidths));
  }

  // Current active solution for the UI.
  get selectedSolution(): LaborSolution | null {
    return this.solutions.find(solution => solution.id === this.selectedSolutionId) || null;
  }

  // CRUD operations for solutions.
  addSolution(): void {
    const solution = this.laborSolutionsService.addSolution('New Solution');
    this.selectedSolutionId = solution.id;
  }

  selectSolution(solution: LaborSolution): void {
    this.selectedSolutionId = solution.id;
    this.cancelEdit();
  }

  deleteSolution(solution: LaborSolution): void {
    if (!confirm(`Delete solution "${solution.name}"?`)) return;
    this.laborSolutionsService.deleteSolution(solution.id);
  }

  // Update editable solution fields from the UI.
  updateSolutionField(field: 'name' | 'description' | 'overheadPercent' | 'contingencyPercent', value: string | number): void {
    if (!this.selectedSolutionId) return;
    const updates: Partial<LaborSolution> = {
      [field]: field === 'overheadPercent' || field === 'contingencyPercent'
        ? Number(value)
        : value
    } as Partial<LaborSolution>;
    this.laborSolutionsService.updateSolution(this.selectedSolutionId, updates);
  }

  // Work item row management inside a solution.
  addWorkItemRow(): void {
    const solution = this.selectedSolution;
    if (!solution || this.items.length === 0) return;
    const catalogItem = this.items[0];
    const newItem: LaborSolutionItem = {
      id: `sol-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      catalogItemId: catalogItem.id,
      quantity: 1,
      hoursPerUnit: catalogItem.hoursPerSwitch,
      ratePerHour: catalogItem.ratePerHour
    };
    this.laborSolutionsService.updateSolution(solution.id, {
      items: [...solution.items, newItem]
    });
  }

  updateCatalogItem(entry: LaborSolutionItem, catalogItemId: string): void {
    const solution = this.selectedSolution;
    if (!solution) return;
    const catalog = this.items.find(item => item.id === catalogItemId);
    if (!catalog) return;
    const updatedItems = solution.items.map(item =>
      item.id === entry.id
        ? {
            ...item,
            catalogItemId,
            hoursPerUnit: catalog.hoursPerSwitch,
            ratePerHour: catalog.ratePerHour
          }
        : item
    );
    this.laborSolutionsService.updateSolution(solution.id, { items: updatedItems });
  }

  removeWorkItemRow(item: LaborSolutionItem): void {
    const solution = this.selectedSolution;
    if (!solution) return;
    const catalogItem = this.getCatalogItem(item);
    const label = catalogItem?.name || 'this item';
    if (!confirm(`Delete ${label}?`)) return;
    this.laborSolutionsService.updateSolution(solution.id, {
      items: solution.items.filter(entry => entry.id !== item.id)
    });
    if (this.editingItemId === item.id) {
      this.cancelEdit();
    }
  }

  // Catalog lookup helpers and filtering.
  getCatalogItem(solutionItem: LaborSolutionItem): LaborBudgetItem | null {
    return this.items.find(item => item.id === solutionItem.catalogItemId) || null;
  }

  getFilteredCatalogItems(): LaborBudgetItem[] {
    return this.items.filter(item => {
      const matchesReference = this.referenceArchitectureFilter === 'All'
        ? true
        : item.referenceArchitecture === this.referenceArchitectureFilter;
      const matchesUnit = this.unitFilter === 'All'
        ? true
        : item.unitOfMeasure === this.unitFilter;
      return matchesReference && matchesUnit;
    });
  }

  onReferenceArchitectureChange(): void {
    const filtered = this.getFilteredCatalogItems();
    const solution = this.selectedSolution;
    if (!solution || filtered.length === 0) return;
    const validIds = new Set(filtered.map(item => item.id));
    const updatedItems = solution.items.map(entry =>
      validIds.has(entry.catalogItemId) ? entry : { ...entry, catalogItemId: filtered[0].id }
    );
    this.laborSolutionsService.updateSolution(solution.id, { items: updatedItems });
  }

  onUnitFilterChange(): void {
    this.onReferenceArchitectureChange();
  }

  // Calculations for line items and rollups.
  getLineHours(entry: LaborSolutionItem): number {
    return entry.quantity * entry.hoursPerUnit;
  }

  getLineCost(entry: LaborSolutionItem): number {
    return this.getLineHours(entry) * entry.ratePerHour;
  }

  getFilteredWorkItems(): LaborSolutionItem[] {
    const solution = this.selectedSolution;
    if (!solution) return [];
    const term = this.searchTerm.trim().toLowerCase();
    const filtered = solution.items.filter(entry => {
      const catalog = this.getCatalogItem(entry);
      const name = catalog?.name || '';
      const role = catalog?.section || '';
      if (!term) return true;
      return name.toLowerCase().includes(term) || role.toLowerCase().includes(term);
    });

    return filtered.sort((a, b) => {
      const catalogA = this.getCatalogItem(a);
      const catalogB = this.getCatalogItem(b);
      const nameA = catalogA?.name || '';
      const nameB = catalogB?.name || '';
      const roleA = catalogA?.section || '';
      const roleB = catalogB?.section || '';
      const costA = this.getLineCost(a);
      const costB = this.getLineCost(b);

      let comparison = 0;
      if (this.sortKey === 'name') {
        comparison = nameA.localeCompare(nameB);
      } else if (this.sortKey === 'role') {
        comparison = roleA.localeCompare(roleB);
      } else {
        comparison = costA - costB;
      }

      return this.sortDirection === 'asc' ? comparison : comparison * -1;
    });
  }

  toggleSort(key: 'name' | 'role' | 'cost'): void {
    if (this.sortKey === key) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      return;
    }
    this.sortKey = key;
    this.sortDirection = 'asc';
  }

  // Inline edit lifecycle for work item rows.
  startEdit(item: LaborSolutionItem): void {
    this.editingItemId = item.id;
    this.editDraft = {
      quantity: item.quantity,
      hoursPerUnit: item.hoursPerUnit,
      ratePerHour: item.ratePerHour
    };
  }

  getEditDraftValue(field: 'quantity' | 'hoursPerUnit' | 'ratePerHour'): number {
    if (!this.editDraft) return 0;
    return this.editDraft[field];
  }

  updateEditDraftValue(field: 'quantity' | 'hoursPerUnit' | 'ratePerHour', value: string | number): void {
    if (!this.editDraft) return;
    this.editDraft[field] = Number(value);
  }

  saveEdit(item: LaborSolutionItem): void {
    const solution = this.selectedSolution;
    if (!solution || !this.editDraft) return;
    const updatedItems = solution.items.map(entry =>
      entry.id === item.id
        ? {
            ...entry,
            quantity: Math.max(1, Number(this.editDraft?.quantity ?? entry.quantity)),
            hoursPerUnit: Math.max(0, Number(this.editDraft?.hoursPerUnit ?? entry.hoursPerUnit)),
            ratePerHour: Math.max(0, Number(this.editDraft?.ratePerHour ?? entry.ratePerHour))
          }
        : entry
    );
    this.laborSolutionsService.updateSolution(solution.id, { items: updatedItems });
    this.cancelEdit();
  }

  cancelEdit(): void {
    this.editingItemId = null;
    this.editDraft = null;
  }

  handleEditKeydown(event: KeyboardEvent, item: LaborSolutionItem): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.saveEdit(item);
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelEdit();
    }
  }

  // Solution and overall totals.
  getSolutionSubtotal(solution: LaborSolution): number {
    return solution.items.reduce((sum, entry) => sum + this.getLineCost(entry), 0);
  }

  getSolutionOverhead(solution: LaborSolution): number {
    return this.getSolutionSubtotal(solution) * (solution.overheadPercent / 100);
  }

  getSolutionContingency(solution: LaborSolution): number {
    return this.getSolutionSubtotal(solution) * (solution.contingencyPercent / 100);
  }

  getSolutionTotal(solution: LaborSolution): number {
    return this.getSolutionSubtotal(solution) + this.getSolutionOverhead(solution) + this.getSolutionContingency(solution);
  }

  getGrandSubtotal(): number {
    return this.solutions.reduce((sum, solution) => sum + this.getSolutionSubtotal(solution), 0);
  }

  getGrandOverhead(): number {
    return this.solutions.reduce((sum, solution) => sum + this.getSolutionOverhead(solution), 0);
  }

  getGrandContingency(): number {
    return this.solutions.reduce((sum, solution) => sum + this.getSolutionContingency(solution), 0);
  }

  getGrandTotal(): number {
    return this.solutions.reduce((sum, solution) => sum + this.getSolutionTotal(solution), 0);
  }

  getGroupedTotalsForSolution(solution: LaborSolution | null): Array<{ section: string; total: number; items: number }>{
    if (!solution) return [];
    const totals: Record<string, { total: number; items: number }> = {};
    solution.items.forEach(entry => {
      const catalog = this.getCatalogItem(entry);
      const section = catalog?.section || 'General';
      const lineTotal = this.getLineCost(entry);
      if (!totals[section]) {
        totals[section] = { total: 0, items: 0 };
      }
      totals[section].total += lineTotal;
      totals[section].items += 1;
    });

    return Object.keys(totals)
      .sort()
      .map(section => ({
        section,
        total: totals[section].total,
        items: totals[section].items
      }));
  }

  getGroupedTotalsAll(): Array<{ section: string; total: number; items: number }>{
    const totals: Record<string, { total: number; items: number }> = {};
    this.solutions.forEach(solution => {
      solution.items.forEach(entry => {
        const catalog = this.getCatalogItem(entry);
        const section = catalog?.section || 'General';
        const lineTotal = this.getLineCost(entry);
        if (!totals[section]) {
          totals[section] = { total: 0, items: 0 };
        }
        totals[section].total += lineTotal;
        totals[section].items += 1;
      });
    });

    return Object.keys(totals)
      .sort()
      .map(section => ({
        section,
        total: totals[section].total,
        items: totals[section].items
      }));
  }

  // Grouping helpers used by summary sections.
  getGroupUnits(section: string, solution: LaborSolution | null): string[] {
    const units = new Set<string>();
    if (!solution) return [];
    solution.items.forEach(entry => {
      const catalog = this.getCatalogItem(entry);
      if (!catalog) return;
      if ((catalog.section || 'General') !== section) return;
      units.add(catalog.unitOfMeasure || 'Unit');
    });
    return Array.from(units).sort();
  }

  get serverWorksheetTotal(): number {
    return (this.serverNew || 0) + (this.serverUpgrade || 0) + (this.serverPhysicalInstall || 0);
  }

  // Finalize a labor budget quote from the current calculator state.
  createQuote(): void {
    this.errorMessage = '';

    const selectedCustomer = this.customers.find(customer => customer.id === this.selectedCustomerId);
    if (!selectedCustomer) {
      this.errorMessage = 'Please select a customer to create a quote.';
      return;
    }
    if (this.solutions.length === 0) {
      this.errorMessage = 'Add at least one solution to create a quote.';
      return;
    }
    if (this.solutions.every(solution => solution.items.length === 0)) {
      this.errorMessage = 'Add at least one work item to create a quote.';
      return;
    }

    const now = new Date();
    const createdDate = now.toLocaleDateString();
    const createdTime = now.toLocaleTimeString();

    const workItems = this.solutions
      .flatMap(solution => solution.items.map(entry => {
        const catalog = this.getCatalogItem(entry);
        if (!catalog) return null;
        const lineHours = this.getLineHours(entry);
        const lineTotal = this.getLineCost(entry);
        return {
          name: catalog.name,
          referenceArchitecture: catalog.referenceArchitecture,
          section: catalog.section,
          unitOfMeasure: catalog.unitOfMeasure,
          closetCount: 1,
          switchCount: entry.quantity,
          hoursPerSwitch: entry.hoursPerUnit,
          ratePerHour: entry.ratePerHour,
          lineHours,
          lineTotal,
          solutionName: solution.name
        };
      }))
      .filter(Boolean) as Array<{
        name: string;
        referenceArchitecture?: ReferenceArchitectureTag;
        section?: string;
        unitOfMeasure?: string;
        closetCount: number;
        switchCount: number;
        hoursPerSwitch: number;
        ratePerHour: number;
        lineHours: number;
        lineTotal: number;
        solutionName?: string;
      }>;

    this.quoteService.createQuote({
      type: 'labor',
      customerName: selectedCustomer.name,
      notes: this.notes.trim(),
      service: 'Labor Budget',
      numberOfUsers: 0,
      durationMonths: 0,
      monthlyPrice: 0,
      totalPrice: this.getGrandTotal(),
      setupFee: 0,
      discountAmount: 0,
      totalHours: workItems.reduce((sum, item) => sum + item.lineHours, 0),
      workItems,
      laborGroups: this.getGroupedTotalsAll().map(group => ({
        section: group.section,
        total: group.total,
        items: group.items
      })),
      status: 'pending',
      createdDate,
      createdTime,
    });

    alert('Labor budget quote created successfully.');
  }
}
