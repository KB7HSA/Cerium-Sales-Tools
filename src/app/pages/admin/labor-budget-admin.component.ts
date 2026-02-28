import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { LaborBudgetItem, LaborBudgetService, ReferenceArchitectureTag } from '../../shared/services/labor-budget.service';
import { LaborUnitsService } from '../../shared/services/labor-units.service';
import { SolutionBlueprint, SolutionBlueprintItem, SolutionBlueprintService } from '../../shared/services/solution-blueprint.service';

// Admin maintenance for labor catalog items, sections, and solution blueprints.
@Component({
  selector: 'app-labor-budget-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './labor-budget-admin.component.html',
  styleUrl: './labor-budget-admin.component.css'
})
export class LaborBudgetAdminComponent implements OnInit, OnDestroy {
  // Catalog and section data.
  items: LaborBudgetItem[] = [];
  sections: string[] = [];
  laborUnits: string[] = [];
  blueprints: SolutionBlueprint[] = [];
  // New labor item form state.
  newItemName: string = '';
  newItemHours: number = 2;
  newItemRate: number = 225;
  newItemUnitPrice: number = 450;
  newItemSection: string = 'General';
  newItemUnitOfMeasure: string = '';
  newItemReferenceArchitecture: ReferenceArchitectureTag = 'Enterprise Networking';
  newItemDescription: string = '';
  newItemTooltip: string = '';
  newSectionName: string = '';
  errorMessage: string = '';

  // Solution blueprint form state.
  blueprintFormId: string | null = null;
  blueprintName: string = '';
  blueprintDescription: string = '';
  blueprintOverheadPercent: number = 10;
  blueprintContingencyPercent: number = 5;
  blueprintItems: SolutionBlueprintItem[] = [];
  blueprintProjectManagementPercent: number = 10;
  blueprintProjectManagementHours: number = 0;
  blueprintProjectManagementRate: number = 225;
  blueprintProjectManagementNotes: string = '';
  blueprintAdoptionHours: number = 0;
  blueprintAdoptionRate: number = 175;
  blueprintAdoptionNotes: string = '';
  blueprintReferenceArchitecture: string = '';
  blueprintErrorMessage: string = '';

  // Filtering and inline edit state.
  referenceArchitectureFilter: 'All' | ReferenceArchitectureTag = 'All';

  editingItems: Record<string, boolean> = {};
  itemDrafts: Record<string, LaborBudgetItem> = {};

  referenceArchitectureTags: ReferenceArchitectureTag[] = [
    'Enterprise Networking',
    'Data Center',
    'Security',
    'Collaboration',
    'Contact Center'
  ];

  private subscription: Subscription = new Subscription();

  constructor(
    private laborBudgetService: LaborBudgetService,
    private laborUnitsService: LaborUnitsService,
    private solutionBlueprintService: SolutionBlueprintService
  ) {}

  // Load catalog items, sections, units, and saved blueprints.
  ngOnInit(): void {
    this.subscription.add(
      this.laborBudgetService.getItems().subscribe(items => {
        this.items = items;
      })
    );
    this.subscription.add(
      this.laborBudgetService.getSections().subscribe(sections => {
        this.sections = sections;
        if (!this.newItemSection && sections.length > 0) {
          this.newItemSection = sections[0];
        }
        if (this.newItemSection && !sections.includes(this.newItemSection)) {
          this.newItemSection = sections[0] || 'General';
        }
      })
    );
    this.subscription.add(
      this.laborUnitsService.getUnits$().subscribe(units => {
        this.laborUnits = units;
        if (!this.newItemUnitOfMeasure && units.length > 0) {
          this.newItemUnitOfMeasure = units[0];
        }
        if (this.newItemUnitOfMeasure && !units.includes(this.newItemUnitOfMeasure)) {
          this.newItemUnitOfMeasure = units[0] || '';
        }
      })
    );
    this.subscription.add(
      this.solutionBlueprintService.getBlueprints().subscribe(blueprints => {
        this.blueprints = blueprints;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  // Create a new labor catalog item.
  addItem(): void {
    if (!this.newItemName.trim()) {
      this.errorMessage = 'Work item name is required';
      return;
    }
    if (this.newItemHours < 0 || this.newItemRate < 0 || this.newItemUnitPrice < 0) {
      this.errorMessage = 'Hours, rate, and price must be zero or higher';
      return;
    }

    const derivedUnitPrice = this.newItemUnitPrice || (this.newItemHours * this.newItemRate);

    this.laborBudgetService.addItem({
      name: this.newItemName.trim(),
      hoursPerSwitch: this.newItemHours,
      ratePerHour: this.newItemRate,
      unitPrice: derivedUnitPrice,
      unitOfMeasure: this.newItemUnitOfMeasure || 'Unit',
      section: this.newItemSection.trim() || 'General',
      referenceArchitecture: this.newItemReferenceArchitecture,
      description: this.newItemDescription.trim(),
      tooltip: this.newItemTooltip.trim()
    });

    this.newItemName = '';
    this.newItemHours = 2;
    this.newItemRate = 225;
    this.newItemUnitPrice = 450;
    this.newItemSection = 'General';
    this.newItemUnitOfMeasure = this.laborUnits[0] || '';
    this.newItemReferenceArchitecture = 'Enterprise Networking';
    this.newItemDescription = '';
    this.newItemTooltip = '';
    this.errorMessage = '';
  }

  // Section management for catalog grouping.
  addSection(): void {
    this.errorMessage = '';
    if (!this.newSectionName.trim()) {
      this.errorMessage = 'Section name is required';
      return;
    }
    const added = this.laborBudgetService.addSection(this.newSectionName);
    if (!added) {
      this.errorMessage = 'Section name must be unique';
      return;
    }
    this.newSectionName = '';
  }

  deleteSection(section: string): void {
    if (!confirm(`Delete section "${section}"? Items in this section will move to General.`)) {
      return;
    }
    const deleted = this.laborBudgetService.deleteSection(section);
    if (!deleted) {
      this.errorMessage = 'Cannot delete that section.';
      return;
    }
    this.errorMessage = '';
  }

  // Inline edit lifecycle for catalog items.
  startEditItem(item: LaborBudgetItem): void {
    this.editingItems[item.id] = true;
    this.itemDrafts[item.id] = { ...item };
  }

  cancelEditItem(item: LaborBudgetItem): void {
    this.editingItems[item.id] = false;
    this.itemDrafts[item.id] = { ...item };
  }

  saveEditItem(item: LaborBudgetItem): void {
    const draft = this.itemDrafts[item.id];
    if (!draft || !draft.name.trim()) {
      this.errorMessage = 'Work item name is required';
      return;
    }
    if (draft.hoursPerSwitch < 0 || draft.ratePerHour < 0 || draft.unitPrice < 0) {
      this.errorMessage = 'Hours, rate, and price must be zero or higher';
      return;
    }

    this.laborBudgetService.updateItem(item.id, {
      name: draft.name.trim(),
      hoursPerSwitch: draft.hoursPerSwitch,
      ratePerHour: draft.ratePerHour,
      unitPrice: draft.unitPrice || (draft.hoursPerSwitch * draft.ratePerHour),
      unitOfMeasure: draft.unitOfMeasure || 'Unit',
      section: draft.section?.trim() || 'General',
      referenceArchitecture: draft.referenceArchitecture,
      description: draft.description?.trim() || '',
      tooltip: draft.tooltip?.trim() || ''
    });

    this.editingItems[item.id] = false;
    this.errorMessage = '';
  }

  deleteItem(item: LaborBudgetItem): void {
    if (confirm(`Delete labor item "${item.name}"?`)) {
      this.laborBudgetService.deleteItem(item.id);
    }
  }

  // Blueprint item grid helpers.
  addBlueprintItemRow(): void {
    if (this.items.length === 0) {
      this.blueprintErrorMessage = 'Add a labor item before adding blueprint rows.';
      return;
    }
    const catalog = this.items[0];
    this.blueprintItems = [
      ...this.blueprintItems,
      {
        id: this.createBlueprintItemId(),
        catalogItemId: catalog.id,
        quantity: 1,
        hoursPerUnit: catalog.hoursPerSwitch,
        ratePerHour: catalog.ratePerHour,
        catalogSnapshot: this.buildCatalogSnapshot(catalog)
      }
    ];
    this.blueprintErrorMessage = '';
  }

  updateBlueprintItemCatalog(item: SolutionBlueprintItem, catalogItemId: string): void {
    const catalog = this.items.find(entry => entry.id === catalogItemId);
    if (!catalog) return;
    this.blueprintItems = this.blueprintItems.map(entry =>
      entry.id === item.id
        ? {
            ...entry,
            catalogItemId,
            hoursPerUnit: catalog.hoursPerSwitch,
            ratePerHour: catalog.ratePerHour,
            catalogSnapshot: this.buildCatalogSnapshot(catalog)
          }
        : entry
    );
  }

  updateBlueprintItemValue(item: SolutionBlueprintItem, field: keyof SolutionBlueprintItem, value: string | number): void {
    this.blueprintItems = this.blueprintItems.map(entry =>
      entry.id === item.id
        ? { ...entry, [field]: Number(value) }
        : entry
    );
  }

  removeBlueprintItemRow(item: SolutionBlueprintItem): void {
    this.blueprintItems = this.blueprintItems.filter(entry => entry.id !== item.id);
  }

  // Create or update a solution blueprint.
  saveBlueprint(): void {
    this.blueprintErrorMessage = '';
    if (!this.blueprintName.trim()) {
      this.blueprintErrorMessage = 'Blueprint name is required.';
      return;
    }
    if (this.blueprintItems.length === 0) {
      this.blueprintErrorMessage = 'Add at least one work item to the blueprint.';
      return;
    }

    const payload = {
      name: this.blueprintName.trim(),
      description: this.blueprintDescription.trim(),
      overheadPercent: this.blueprintOverheadPercent,
      contingencyPercent: this.blueprintContingencyPercent,
      items: this.blueprintItems.map(item => ({
        ...item,
        quantity: Math.max(0, Number(item.quantity)),
        hoursPerUnit: Math.max(0, Number(item.hoursPerUnit)),
        ratePerHour: Math.max(0, Number(item.ratePerHour)),
        catalogSnapshot: item.catalogSnapshot || this.buildCatalogSnapshot(
          this.items.find(entry => entry.id === item.catalogItemId)
        )
      })),
      projectManagementPercent: this.blueprintProjectManagementPercent,
      projectManagementHours: this.blueprintProjectManagementHours,
      projectManagementRatePerHour: this.blueprintProjectManagementRate,
      projectManagementNotes: this.blueprintProjectManagementNotes.trim(),
      adoptionHours: this.blueprintAdoptionHours,
      adoptionRatePerHour: this.blueprintAdoptionRate,
      adoptionNotes: this.blueprintAdoptionNotes.trim(),
      referenceArchitecture: this.blueprintReferenceArchitecture || ''
    };

    if (this.blueprintFormId) {
      this.solutionBlueprintService.updateBlueprint(this.blueprintFormId, payload);
    } else {
      this.solutionBlueprintService.addBlueprint(payload);
    }

    this.resetBlueprintForm();
  }

  editBlueprint(blueprint: SolutionBlueprint): void {
    this.blueprintFormId = blueprint.id;
    this.blueprintName = blueprint.name;
    this.blueprintDescription = blueprint.description;
    this.blueprintOverheadPercent = blueprint.overheadPercent;
    this.blueprintContingencyPercent = blueprint.contingencyPercent;
    this.blueprintItems = blueprint.items.map(item => ({ ...item }));
    this.blueprintProjectManagementPercent = blueprint.projectManagementPercent;
    this.blueprintProjectManagementHours = blueprint.projectManagementHours;
    this.blueprintProjectManagementRate = blueprint.projectManagementRatePerHour;
    this.blueprintProjectManagementNotes = blueprint.projectManagementNotes;
    this.blueprintAdoptionHours = blueprint.adoptionHours;
    this.blueprintAdoptionRate = blueprint.adoptionRatePerHour;
    this.blueprintAdoptionNotes = blueprint.adoptionNotes;
    this.blueprintReferenceArchitecture = blueprint.referenceArchitecture || '';
    this.blueprintErrorMessage = '';
  }

  // Remove a saved blueprint.
  deleteBlueprint(blueprint: SolutionBlueprint): void {
    if (!confirm(`Delete solution blueprint "${blueprint.name}"?`)) return;
    this.solutionBlueprintService.deleteBlueprint(blueprint.id);
    if (this.blueprintFormId === blueprint.id) {
      this.resetBlueprintForm();
    }
  }

  // Reset blueprint form inputs to defaults.
  resetBlueprintForm(): void {
    this.blueprintFormId = null;
    this.blueprintName = '';
    this.blueprintDescription = '';
    this.blueprintOverheadPercent = 10;
    this.blueprintContingencyPercent = 5;
    this.blueprintItems = [];
    this.blueprintProjectManagementPercent = 10;
    this.blueprintProjectManagementHours = 0;
    this.blueprintProjectManagementRate = 225;
    this.blueprintProjectManagementNotes = '';
    this.blueprintAdoptionHours = 0;
    this.blueprintAdoptionRate = 175;
    this.blueprintAdoptionNotes = '';
    this.blueprintReferenceArchitecture = '';
    this.blueprintErrorMessage = '';
  }

  // Filtered catalog list for the admin table.
  get filteredItems(): LaborBudgetItem[] {
    if (this.referenceArchitectureFilter === 'All') {
      return this.items;
    }
    return this.items.filter(item => item.referenceArchitecture === this.referenceArchitectureFilter);
  }

  // Utility helpers for blueprint item IDs and snapshots.
  private createBlueprintItemId(): string {
    return `blueprint-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private buildCatalogSnapshot(item: LaborBudgetItem | undefined): SolutionBlueprintItem['catalogSnapshot'] {
    if (!item) return undefined;
    return {
      name: item.name,
      hoursPerSwitch: item.hoursPerSwitch,
      ratePerHour: item.ratePerHour,
      unitPrice: item.unitPrice,
      unitOfMeasure: item.unitOfMeasure,
      section: item.section,
      referenceArchitecture: item.referenceArchitecture,
      description: item.description || '',
      tooltip: item.tooltip || ''
    };
  }
}
