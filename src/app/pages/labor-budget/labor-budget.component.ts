import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { LaborBudgetItem, LaborBudgetService, ReferenceArchitectureTag } from '../../shared/services/labor-budget.service';
import { QuoteService } from '../../shared/services/quote.service';

@Component({
  selector: 'app-labor-budget',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './labor-budget.component.html',
  styleUrl: './labor-budget.component.css'
})
export class LaborBudgetComponent implements OnInit, OnDestroy {
  items: LaborBudgetItem[] = [];
  workItems: Array<{
    id: string;
    switchCount: number;
    closetCount: number;
    referenceArchitectureFilter: 'All' | ReferenceArchitectureTag;
  }> = [];
  customerName: string = '';
  notes: string = '';
  errorMessage: string = '';

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
    private quoteService: QuoteService
  ) {}

  ngOnInit(): void {
    this.subscription.add(
      this.laborBudgetService.getItems().subscribe(items => {
        this.items = items;
        if (this.workItems.length === 0 && items.length > 0) {
          this.addWorkItem();
        }
        if (items.length > 0) {
          const fallbackId = items[0].id;
          this.workItems = this.workItems.map(entry => ({
            ...entry,
            id: entry.id || fallbackId
          }));
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  addWorkItem(): void {
    if (this.items.length === 0) return;
    this.workItems.push({
      id: this.items[0].id,
      switchCount: 1,
      closetCount: 1,
      referenceArchitectureFilter: 'All'
    });
  }

  removeWorkItem(index: number): void {
    this.workItems.splice(index, 1);
  }

  getItem(id: string): LaborBudgetItem | null {
    return this.items.find(item => item.id === id) || null;
  }

  getFilteredItems(entry: { referenceArchitectureFilter: 'All' | ReferenceArchitectureTag }): LaborBudgetItem[] {
    if (entry.referenceArchitectureFilter === 'All') {
      return this.items;
    }
    return this.items.filter(item => item.referenceArchitecture === entry.referenceArchitectureFilter);
  }

  onReferenceArchitectureChange(entry: {
    id: string;
    referenceArchitectureFilter: 'All' | ReferenceArchitectureTag;
  }): void {
    const filtered = this.getFilteredItems(entry);
    if (filtered.length === 0) return;
    if (!filtered.some(item => item.id === entry.id)) {
      entry.id = filtered[0].id;
    }
  }

  getLineHours(entry: { id: string; switchCount: number; closetCount: number }): number {
    const item = this.getItem(entry.id);
    if (!item) return 0;
    return entry.switchCount * entry.closetCount * item.hoursPerSwitch;
  }

  getLineCost(entry: { id: string; switchCount: number; closetCount: number }): number {
    const item = this.getItem(entry.id);
    if (!item) return 0;
    return this.getLineHours(entry) * item.ratePerHour;
  }

  get totalHours(): number {
    return this.workItems.reduce((sum, entry) => sum + this.getLineHours(entry), 0);
  }

  get totalCost(): number {
    return this.workItems.reduce((sum, entry) => sum + this.getLineCost(entry), 0);
  }

  createQuote(): void {
    this.errorMessage = '';

    if (!this.customerName.trim()) {
      this.errorMessage = 'Customer name is required to create a quote.';
      return;
    }
    if (this.workItems.length === 0) {
      this.errorMessage = 'Add at least one work item to create a quote.';
      return;
    }

    const now = new Date();
    const createdDate = now.toLocaleDateString();
    const createdTime = now.toLocaleTimeString();

    const workItems = this.workItems
      .map(entry => {
        const item = this.getItem(entry.id);
        if (!item) return null;
        const lineHours = this.getLineHours(entry);
        const lineTotal = this.getLineCost(entry);
        return {
          name: item.name,
          referenceArchitecture: item.referenceArchitecture,
          closetCount: entry.closetCount,
          switchCount: entry.switchCount,
          hoursPerSwitch: item.hoursPerSwitch,
          ratePerHour: item.ratePerHour,
          lineHours,
          lineTotal
        };
      })
      .filter(Boolean) as Array<{
        name: string;
        closetCount: number;
        switchCount: number;
        hoursPerSwitch: number;
        ratePerHour: number;
        lineHours: number;
        lineTotal: number;
      }>;

    this.quoteService.createQuote({
      type: 'labor',
      customerName: this.customerName.trim(),
      notes: this.notes.trim(),
      service: 'Labor Budget',
      numberOfUsers: 0,
      durationMonths: 0,
      monthlyPrice: 0,
      totalPrice: this.totalCost,
      setupFee: 0,
      discountAmount: 0,
      totalHours: this.totalHours,
      workItems,
      status: 'pending',
      createdDate,
      createdTime,
    });

    alert('Labor budget quote created successfully.');
  }
}
