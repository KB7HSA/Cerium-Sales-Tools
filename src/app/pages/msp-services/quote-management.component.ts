import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { QuoteService, Quote } from '../../shared/services/quote.service';

@Component({
  selector: 'app-quote-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './quote-management.component.html',
  styleUrl: './quote-management.component.css',
})
export class QuoteManagementComponent implements OnInit {
  quotes: Quote[] = [];
  activeTab: 'all' | 'pending' | 'approved' | 'denied' = 'all';
  expandedQuoteId: string | null = null;
  laborSectionFilters: Record<string, string> = {};
  editingQuoteId: string | null = null;
  quoteDrafts: Record<string, Quote> = {};

  constructor(public quoteService: QuoteService) {}

  ngOnInit(): void {
    this.quoteService.quotes$.subscribe(quotes => {
      this.quotes = quotes;
    });
  }

  getFilteredQuotes(): Quote[] {
    switch (this.activeTab) {
      case 'pending':
        return this.quoteService.getPendingQuotes();
      case 'approved':
        return this.quoteService.getApprovedQuotes();
      case 'denied':
        return this.quoteService.getDeniedQuotes();
      case 'all':
      default:
        return this.quoteService.getQuotes();
    }
  }

  setActiveTab(tab: 'all' | 'pending' | 'approved' | 'denied'): void {
    this.activeTab = tab;
  }

  toggleExpanded(quoteId: string): void {
    this.expandedQuoteId = this.expandedQuoteId === quoteId ? null : quoteId;
  }

  startEditQuote(quote: Quote): void {
    if (quote.status !== 'pending') return;
    this.editingQuoteId = quote.id;
    this.quoteDrafts[quote.id] = JSON.parse(JSON.stringify(quote)) as Quote;
  }

  cancelEditQuote(quoteId: string): void {
    if (this.editingQuoteId === quoteId) {
      this.editingQuoteId = null;
    }
    delete this.quoteDrafts[quoteId];
  }

  saveEditQuote(quote: Quote): void {
    const draft = this.quoteDrafts[quote.id];
    if (!draft) return;

    if (!draft.customerName.trim()) {
      alert('Customer name is required.');
      return;
    }

    const updates: Partial<Quote> = {
      customerName: draft.customerName.trim(),
      notes: draft.notes?.trim() || ''
    };

    if (quote.type === 'msp') {
      updates.numberOfUsers = this.toNumber(draft.numberOfUsers);
      updates.durationMonths = this.toNumber(draft.durationMonths);
      updates.monthlyPrice = this.toNumber(draft.monthlyPrice);
      updates.basePricePerUnit = this.toNumber(draft.basePricePerUnit ?? 0);
      updates.professionalServicesPrice = this.toNumber(draft.professionalServicesPrice ?? 0);
      updates.setupFee = this.toNumber(draft.setupFee);
      updates.discountAmount = this.toNumber(draft.discountAmount);
      updates.perUnitTotal = this.toNumber(draft.perUnitTotal ?? 0);
      updates.addOnPerUnitTotal = this.toNumber(draft.addOnPerUnitTotal ?? 0);
      updates.addOnMonthlyTotal = this.toNumber(draft.addOnMonthlyTotal ?? 0);
      updates.addOnOneTimeTotal = this.toNumber(draft.addOnOneTimeTotal ?? 0);
      updates.totalPrice = this.toNumber(draft.totalPrice);
      updates.selectedOptions = (draft.selectedOptions || []).map(option => ({
        ...option,
        monthlyPrice: this.toNumber(option.monthlyPrice),
        name: option.name?.trim() || option.name
      }));
    } else {
      updates.totalHours = this.toNumber(draft.totalHours ?? 0);
      updates.totalPrice = this.toNumber(draft.totalPrice);
      updates.workItems = (draft.workItems || []).map(item => ({
        ...item,
        name: item.name?.trim() || item.name,
        switchCount: this.toNumber(item.switchCount),
        hoursPerSwitch: this.toNumber(item.hoursPerSwitch),
        ratePerHour: this.toNumber(item.ratePerHour),
        lineHours: this.toNumber(item.lineHours),
        lineTotal: this.toNumber(item.lineTotal)
      }));
    }

    this.quoteService.updateQuote(quote.id, updates);
    this.cancelEditQuote(quote.id);
    alert('Quote updated successfully.');
  }

  setLaborSectionFilter(quoteId: string, section: string): void {
    this.laborSectionFilters[quoteId] = section;
  }

  getLaborSections(quote: Quote): string[] {
    const sections = new Set<string>();
    (quote.laborGroups || []).forEach(group => sections.add(group.section));
    (quote.workItems || []).forEach(item => {
      if (item.section) sections.add(item.section);
    });
    return ['All', ...Array.from(sections).sort()];
  }

  getLaborGroups(quote: Quote): Array<{ section: string; total: number; items: number }>{
    if (quote.laborGroups && quote.laborGroups.length > 0) {
      return quote.laborGroups;
    }

    const totals: Record<string, { total: number; items: number }> = {};
    (quote.workItems || []).forEach(item => {
      const section = item.section || 'General';
      if (!totals[section]) {
        totals[section] = { total: 0, items: 0 };
      }
      totals[section].total += item.lineTotal || 0;
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

  getLaborWorkItems(quote: Quote): Quote['workItems'] {
    const items = quote.workItems || [];
    const filter = this.laborSectionFilters[quote.id] || 'All';
    if (filter === 'All') {
      return items;
    }
    return items.filter(item => item.section === filter);
  }

  approveQuote(quoteId: string): void {
    this.quoteService.updateQuoteStatus(quoteId, 'approved');
    alert('Quote approved successfully!');
  }

  denyQuote(quoteId: string): void {
    this.quoteService.updateQuoteStatus(quoteId, 'denied');
    alert('Quote denied.');
  }

  deleteQuote(quoteId: string): void {
    if (confirm('Are you sure you want to delete this quote?')) {
      this.quoteService.deleteQuote(quoteId);
      alert('Quote deleted successfully!');
    }
  }

  getStatusBadgeColor(status: string): string {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200';
      case 'approved':
        return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200';
      case 'denied':
        return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }

  getTotalQuotes(): number {
    return this.quoteService.getQuotes().length;
  }

  getTotalRevenue(): number {
    return this.quoteService.getApprovedQuotes().reduce((sum, q) => sum + q.totalPrice, 0);
  }

  getPendingValue(): number {
    return this.quoteService.getPendingQuotes().reduce((sum, q) => sum + q.totalPrice, 0);
  }

  updateSelectedOptionField(quoteId: string, index: number, field: 'name' | 'monthlyPrice' | 'pricingUnit', value: string | number): void {
    const draft = this.quoteDrafts[quoteId];
    if (!draft || !draft.selectedOptions || !draft.selectedOptions[index]) return;
    if (field === 'monthlyPrice') {
      draft.selectedOptions[index].monthlyPrice = this.toNumber(value);
    } else {
      draft.selectedOptions[index][field] = String(value);
    }
  }

  updateLaborItemField(
    quoteId: string,
    index: number,
    field: 'name' | 'section' | 'unitOfMeasure' | 'switchCount' | 'hoursPerSwitch' | 'ratePerHour'
    ,
    value: string | number
  ): void {
    const draft = this.quoteDrafts[quoteId];
    if (!draft || !draft.workItems || !draft.workItems[index]) return;
    const item = draft.workItems[index];
    if (field === 'switchCount' || field === 'hoursPerSwitch' || field === 'ratePerHour') {
      (item as any)[field] = this.toNumber(value);
      item.lineHours = this.toNumber(item.switchCount) * this.toNumber(item.hoursPerSwitch);
      item.lineTotal = this.toNumber(item.lineHours) * this.toNumber(item.ratePerHour);
      return;
    }
    (item as any)[field] = String(value);
  }

  private toNumber(value: number | string | undefined): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
