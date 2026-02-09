import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { LaborBudgetItem, LaborBudgetService, ReferenceArchitectureTag } from '../../shared/services/labor-budget.service';

@Component({
  selector: 'app-labor-budget-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './labor-budget-admin.component.html',
  styleUrl: './labor-budget-admin.component.css'
})
export class LaborBudgetAdminComponent implements OnInit, OnDestroy {
  items: LaborBudgetItem[] = [];
  newItemName: string = '';
  newItemHours: number = 2;
  newItemRate: number = 225;
  newItemReferenceArchitecture: ReferenceArchitectureTag = 'Enterprise Networking';
  newItemDescription: string = '';
  errorMessage: string = '';

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

  constructor(private laborBudgetService: LaborBudgetService) {}

  ngOnInit(): void {
    this.subscription.add(
      this.laborBudgetService.getItems().subscribe(items => {
        this.items = items;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  addItem(): void {
    if (!this.newItemName.trim()) {
      this.errorMessage = 'Work item name is required';
      return;
    }
    if (this.newItemHours < 0 || this.newItemRate < 0) {
      this.errorMessage = 'Hours and rate must be zero or higher';
      return;
    }

    this.laborBudgetService.addItem({
      name: this.newItemName.trim(),
      hoursPerSwitch: this.newItemHours,
      ratePerHour: this.newItemRate,
      referenceArchitecture: this.newItemReferenceArchitecture,
      description: this.newItemDescription.trim()
    });

    this.newItemName = '';
    this.newItemHours = 2;
    this.newItemRate = 225;
    this.newItemReferenceArchitecture = 'Enterprise Networking';
    this.newItemDescription = '';
    this.errorMessage = '';
  }

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
    if (draft.hoursPerSwitch < 0 || draft.ratePerHour < 0) {
      this.errorMessage = 'Hours and rate must be zero or higher';
      return;
    }

    this.laborBudgetService.updateItem(item.id, {
      name: draft.name.trim(),
      hoursPerSwitch: draft.hoursPerSwitch,
      ratePerHour: draft.ratePerHour,
      referenceArchitecture: draft.referenceArchitecture,
      description: draft.description?.trim() || ''
    });

    this.editingItems[item.id] = false;
    this.errorMessage = '';
  }

  deleteItem(item: LaborBudgetItem): void {
    if (confirm(`Delete labor item "${item.name}"?`)) {
      this.laborBudgetService.deleteItem(item.id);
    }
  }

  get filteredItems(): LaborBudgetItem[] {
    if (this.referenceArchitectureFilter === 'All') {
      return this.items;
    }
    return this.items.filter(item => item.referenceArchitecture === this.referenceArchitectureFilter);
  }
}
