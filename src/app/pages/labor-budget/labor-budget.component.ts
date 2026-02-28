import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { LaborBudgetItem, LaborBudgetService, ReferenceArchitectureTag } from '../../shared/services/labor-budget.service';
import { LaborSolutionsService, LaborSolution, LaborSolutionItem } from '../../shared/services/labor-solutions.service';
import { SolutionBlueprintService, SolutionBlueprint } from '../../shared/services/solution-blueprint.service';
import { LaborUnitsService } from '../../shared/services/labor-units.service';
import { Customer, CustomerManagementService } from '../../shared/services/customer-management.service';
import { QuoteService } from '../../shared/services/quote.service';
import { AuthService } from '../../shared/services/auth.service';

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
  // Blueprint picker state.
  blueprints: SolutionBlueprint[] = [];
  addedBlueprints: { id: string; name: string; itemCount: number }[] = [];
  showBlueprintPicker: boolean = false;
  blueprintArchFilter: string = 'All';
  // Grouping and reorder state.
  collapsedGroups: Set<string> = new Set();
  editingGroupName: string | null = null;
  editingGroupDraft: string = '';
  newGroupName: string = '';
  showNewGroupInput: boolean = false;
  dragItemId: string | null = null;
  dragOverItemId: string | null = null;
  dragOverPosition: 'above' | 'below' | null = null;

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
    private blueprintService: SolutionBlueprintService,
    private laborUnitsService: LaborUnitsService,
    private customerService: CustomerManagementService,
    private quoteService: QuoteService,
    private authService: AuthService
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
          this.selectedCustomerId = this.customers[0].id || '';
        }
      })
    );
    this.subscription.add(
      this.blueprintService.getBlueprints().subscribe(blueprints => {
        this.blueprints = blueprints;
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

  // Blueprint picker controls.
  toggleBlueprintPicker(): void {
    this.showBlueprintPicker = !this.showBlueprintPicker;
    if (this.showBlueprintPicker) {
      this.blueprintArchFilter = 'All';
    }
  }

  get filteredBlueprints(): SolutionBlueprint[] {
    if (this.blueprintArchFilter === 'All') return this.blueprints;
    return this.blueprints.filter(bp =>
      bp.referenceArchitecture === this.blueprintArchFilter
    );
  }

  addFromBlueprint(blueprint: SolutionBlueprint): void {
    this.showBlueprintPicker = false;

    // Ensure a solution exists to hold work items.
    let solution = this.selectedSolution;
    if (!solution) {
      solution = this.laborSolutionsService.addSolution('Labor Budget');
      this.selectedSolutionId = solution.id;
    }

    // Determine the next sortOrder so new items append after existing ones.
    const maxOrder = solution.items.reduce((max, item) => Math.max(max, item.sortOrder ?? 0), -1);

    // Map blueprint items using the blueprint name as the group name.
    const newItems: LaborSolutionItem[] = blueprint.items.map((bpItem, index) => ({
      id: `sol-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${index}`,
      catalogItemId: bpItem.catalogItemId,
      quantity: bpItem.quantity,
      hoursPerUnit: bpItem.hoursPerUnit,
      ratePerHour: bpItem.ratePerHour,
      groupName: blueprint.name,
      sortOrder: maxOrder + 1 + index
    }));

    this.laborSolutionsService.updateSolution(solution.id, {
      items: [...solution.items, ...newItems]
    });

    // Track which blueprints have been added for sidebar display.
    this.addedBlueprints = [...this.addedBlueprints, {
      id: `added-bp-${Date.now()}`,
      name: blueprint.name,
      itemCount: blueprint.items.length
    }];
  }

  removeAddedBlueprint(addedBp: { id: string; name: string; itemCount: number }): void {
    if (!confirm(`Remove blueprint "${addedBp.name}" and its work items?`)) return;
    const solution = this.selectedSolution;
    if (solution) {
      // Remove all work items whose groupName matches this blueprint.
      const updatedItems = solution.items.filter(item => (item.groupName || 'Default') !== addedBp.name);
      this.laborSolutionsService.updateSolution(solution.id, { items: updatedItems });
    }
    this.addedBlueprints = this.addedBlueprints.filter(bp => bp.id !== addedBp.id);
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
  addWorkItemRow(groupName?: string): void {
    const solution = this.selectedSolution;
    if (!solution || this.items.length === 0) return;
    const catalogItem = this.items[0];
    const maxOrder = solution.items.reduce((max, item) => Math.max(max, item.sortOrder ?? 0), -1);
    const newItem: LaborSolutionItem = {
      id: `sol-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      catalogItemId: catalogItem.id,
      quantity: 1,
      hoursPerUnit: catalogItem.hoursPerSwitch,
      ratePerHour: catalogItem.ratePerHour,
      groupName: groupName || this.getWorkItemGroups()[0] || 'Default',
      sortOrder: maxOrder + 1
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

    // Sort primarily by sortOrder to respect user-defined order
    return filtered.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }

  getFilteredWorkItemsByGroup(group: string): LaborSolutionItem[] {
    return this.getFilteredWorkItems().filter(item => (item.groupName || 'Default') === group);
  }

  // Get distinct group names preserving order of first appearance.
  getWorkItemGroups(): string[] {
    const solution = this.selectedSolution;
    if (!solution) return [];
    const groupSet = new Set<string>();
    const sortedItems = [...solution.items].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    for (const item of sortedItems) {
      groupSet.add(item.groupName || 'Default');
    }
    return Array.from(groupSet);
  }

  getGroupSubtotal(group: string): number {
    return this.getFilteredWorkItemsByGroup(group).reduce((sum, entry) => sum + this.getLineCost(entry), 0);
  }

  getGroupHours(group: string): number {
    return this.getFilteredWorkItemsByGroup(group).reduce((sum, entry) => sum + this.getLineHours(entry), 0);
  }

  toggleGroupCollapse(group: string): void {
    if (this.collapsedGroups.has(group)) {
      this.collapsedGroups.delete(group);
    } else {
      this.collapsedGroups.add(group);
    }
  }

  isGroupCollapsed(group: string): boolean {
    return this.collapsedGroups.has(group);
  }

  // Group name editing
  startEditGroupName(group: string): void {
    this.editingGroupName = group;
    this.editingGroupDraft = group;
  }

  saveGroupName(oldName: string): void {
    const newName = this.editingGroupDraft.trim();
    if (!newName || newName === oldName) {
      this.editingGroupName = null;
      return;
    }
    const solution = this.selectedSolution;
    if (!solution) return;
    const updatedItems = solution.items.map(item =>
      (item.groupName || 'Default') === oldName ? { ...item, groupName: newName } : item
    );
    this.laborSolutionsService.updateSolution(solution.id, { items: updatedItems });
    // Update collapsed state
    if (this.collapsedGroups.has(oldName)) {
      this.collapsedGroups.delete(oldName);
      this.collapsedGroups.add(newName);
    }
    this.editingGroupName = null;
  }

  cancelEditGroupName(): void {
    this.editingGroupName = null;
  }

  handleGroupNameKeydown(event: KeyboardEvent, group: string): void {
    if (event.key === 'Enter') { event.preventDefault(); this.saveGroupName(group); }
    if (event.key === 'Escape') { event.preventDefault(); this.cancelEditGroupName(); }
  }

  // Add new group
  addGroup(): void {
    this.showNewGroupInput = true;
    this.newGroupName = '';
  }

  confirmAddGroup(): void {
    const name = this.newGroupName.trim();
    this.showNewGroupInput = false;
    if (!name) return;
    // Just add a work item row with the new group name
    this.addWorkItemRow(name);
  }

  cancelAddGroup(): void {
    this.showNewGroupInput = false;
  }

  handleNewGroupKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') { event.preventDefault(); this.confirmAddGroup(); }
    if (event.key === 'Escape') { event.preventDefault(); this.cancelAddGroup(); }
  }

  deleteGroup(group: string): void {
    const solution = this.selectedSolution;
    if (!solution) return;
    const itemsInGroup = solution.items.filter(item => (item.groupName || 'Default') === group);
    if (itemsInGroup.length > 0 && !confirm(`Delete group "${group}" and its ${itemsInGroup.length} work item(s)?`)) return;
    const updatedItems = solution.items.filter(item => (item.groupName || 'Default') !== group);
    this.laborSolutionsService.updateSolution(solution.id, { items: updatedItems });
  }

  // Change a work item's group assignment
  changeItemGroup(entry: LaborSolutionItem, newGroup: string): void {
    const solution = this.selectedSolution;
    if (!solution) return;
    const updatedItems = solution.items.map(item =>
      item.id === entry.id ? { ...item, groupName: newGroup } : item
    );
    this.laborSolutionsService.updateSolution(solution.id, { items: updatedItems });
  }

  // Move item up or down within the same group, persisting sortOrder
  moveItemUp(entry: LaborSolutionItem): void {
    this.moveItem(entry, -1);
  }

  moveItemDown(entry: LaborSolutionItem): void {
    this.moveItem(entry, 1);
  }

  private moveItem(entry: LaborSolutionItem, direction: -1 | 1): void {
    const solution = this.selectedSolution;
    if (!solution) return;
    const group = entry.groupName || 'Default';
    const groupItems = solution.items
      .filter(item => (item.groupName || 'Default') === group)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const idx = groupItems.findIndex(item => item.id === entry.id);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= groupItems.length) return;
    // Swap sort orders
    const tempOrder = groupItems[idx].sortOrder ?? idx;
    const swapOrder = groupItems[swapIdx].sortOrder ?? swapIdx;
    const updatedItems = solution.items.map(item => {
      if (item.id === groupItems[idx].id) return { ...item, sortOrder: swapOrder };
      if (item.id === groupItems[swapIdx].id) return { ...item, sortOrder: tempOrder };
      return item;
    });
    this.laborSolutionsService.updateSolution(solution.id, { items: updatedItems });
  }

  // Drag and drop reorder
  onDragStart(event: DragEvent, entry: LaborSolutionItem): void {
    this.dragItemId = entry.id;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', entry.id);
    }
  }

  onDragOver(event: DragEvent, entry: LaborSolutionItem): void {
    event.preventDefault();
    if (this.dragItemId === entry.id) return;
    this.dragOverItemId = entry.id;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.dragOverPosition = event.clientY < rect.top + rect.height / 2 ? 'above' : 'below';
  }

  onDragLeave(event: DragEvent): void {
    this.dragOverItemId = null;
    this.dragOverPosition = null;
  }

  onDrop(event: DragEvent, targetEntry: LaborSolutionItem): void {
    event.preventDefault();
    const solution = this.selectedSolution;
    if (!solution || !this.dragItemId) return;
    const draggedItem = solution.items.find(item => item.id === this.dragItemId);
    if (!draggedItem) return;

    // Move dragged item into target's group at target position
    const targetGroup = targetEntry.groupName || 'Default';
    const groupItems = solution.items
      .filter(item => (item.groupName || 'Default') === targetGroup && item.id !== draggedItem.id)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const targetIdx = groupItems.findIndex(item => item.id === targetEntry.id);
    const insertIdx = this.dragOverPosition === 'below' ? targetIdx + 1 : targetIdx;
    groupItems.splice(insertIdx, 0, { ...draggedItem, groupName: targetGroup });

    // Reassign sort orders for the group
    const updatedMap = new Map<string, LaborSolutionItem>();
    groupItems.forEach((item, i) => updatedMap.set(item.id, { ...item, sortOrder: i }));

    const updatedItems = solution.items.map(item => {
      if (updatedMap.has(item.id)) return updatedMap.get(item.id)!;
      if (item.id === draggedItem.id) return { ...draggedItem, groupName: targetGroup, sortOrder: insertIdx };
      return item;
    });
    this.laborSolutionsService.updateSolution(solution.id, { items: updatedItems });
    this.dragItemId = null;
    this.dragOverItemId = null;
    this.dragOverPosition = null;
  }

  onDragEnd(): void {
    this.dragItemId = null;
    this.dragOverItemId = null;
    this.dragOverPosition = null;
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

  clearLaborBudget(): void {
    if (!confirm('Are you sure you want to clear the current labor budget? This will remove all work items and blueprints.')) {
      return;
    }
    // Clear solutions and work items
    this.laborSolutionsService.replaceSolutions([]);
    this.solutions = [];
    this.selectedSolutionId = '';
    this.addedBlueprints = [];
    // Reset form fields
    this.selectedCustomerId = '';
    this.notes = '';
    this.errorMessage = '';
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
    const currentUser = this.authService.getCurrentUser();

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
          solutionName: solution.name,
          groupName: entry.groupName || 'Default',
          sortOrder: entry.sortOrder ?? 0
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
      customerName: selectedCustomer.name || '',
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
      createdBy: currentUser?.name || 'Unknown User',
      createdByEmail: currentUser?.email || '',
    }).subscribe({
      next: (response) => {
        console.log('[LaborBudget] Quote created successfully:', response);
        alert('Labor budget quote created successfully.');
      },
      error: (error) => {
        console.error('[LaborBudget] Failed to create quote:', error);
        this.errorMessage = 'Failed to create quote. Please try again.';
      }
    });
  }
}
