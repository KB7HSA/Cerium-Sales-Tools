import { Component, OnInit, OnDestroy, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { QuoteService, Quote } from '../../shared/services/quote.service';
import { ExportSchemaService, ExportSchema } from '../../shared/services/export-schema.service';
import { SowGeneratorService } from '../../shared/services/sow-generator.service';

@Component({
  selector: 'app-quote-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './quote-management.component.html',
  styleUrl: './quote-management.component.css',
})
export class QuoteManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  quotes: Quote[] = [];
  activeTab: 'all' | 'pending' | 'approved' | 'denied' = 'all';
  expandedQuoteId: string | null = null;
  laborSectionFilters: Record<string, string> = {};
  editingQuoteId: string | null = null;
  quoteDrafts: Record<string, Quote> = {};
  
  // Export functionality
  showExportDropdown = false;
  exportDropdownQuoteId: string | null = null;
  availableExportSchemas: ExportSchema[] = [];
  @ViewChild('exportDropdown') exportDropdownRef!: ElementRef;
  
  // SOW generation
  sowGenerating = false;

  constructor(
    public quoteService: QuoteService,
    private exportSchemaService: ExportSchemaService,
    private sowGeneratorService: SowGeneratorService
  ) {}

  getQuoteId(quote: Quote): string {
    return (quote.id || quote.Id) || '';
  }

  ngOnInit(): void {
    this.quoteService.quotes$.subscribe(quotes => {
      this.quotes = quotes;
    });
    
    // Load export schemas
    this.exportSchemaService.schemas$
      .pipe(takeUntil(this.destroy$))
      .subscribe(schemas => {
        this.availableExportSchemas = schemas;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Click outside to close export dropdown
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.exportDropdownRef && !this.exportDropdownRef.nativeElement.contains(event.target)) {
      this.showExportDropdown = false;
    }
    // Close per-quote dropdown when clicking outside
    this.exportDropdownQuoteId = null;
  }

  toggleExportDropdown(): void {
    this.showExportDropdown = !this.showExportDropdown;
  }

  toggleQuoteExportDropdown(quoteId: string): void {
    if (this.exportDropdownQuoteId === quoteId) {
      this.exportDropdownQuoteId = null;
    } else {
      this.exportDropdownQuoteId = quoteId;
    }
  }

  getExportSchemasForQuote(quote: Quote): ExportSchema[] {
    const quoteType = quote.type || (quote as any).QuoteType || 'msp';
    return this.availableExportSchemas.filter(s => 
      s.QuoteType.toLowerCase() === quoteType.toLowerCase()
    );
  }

  exportSingleQuote(quote: Quote, schema: ExportSchema): void {
    this.exportDropdownQuoteId = null;
    
    const columns = schema.columns || [];
    if (columns.length === 0) {
      alert('Export schema has no columns configured');
      return;
    }

    // Headers
    const headers = columns.map(col => this.escapeCSV(col.ExportHeader));
    const csvRows = [headers.join(',')];

    // Data row for single quote
    const row = columns.map(col => {
      const value = this.getQuoteFieldValue(quote, col.SourceField, col.FormatType);
      return this.escapeCSV(value);
    });
    csvRows.push(row.join(','));

    // Create and download file
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const customerName = (quote.customerName || 'quote').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `quote_${customerName}_${new Date().toISOString().split('T')[0]}.csv`;
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  getQuoteTypeLabel(quoteType: string): string {
    const types: Record<string, string> = {
      'msp': 'MSP Service',
      'labor': 'Labor Budget'
    };
    return types[quoteType] || quoteType;
  }

  exportQuotes(schema: ExportSchema): void {
    this.showExportDropdown = false;
    
    const quotes = this.getFilteredQuotes();
    if (quotes.length === 0) {
      alert('No quotes to export');
      return;
    }

    // Filter quotes by quote type if schema specifies one
    const filteredQuotes = quotes.filter(q => {
      const quoteType = q.type || (q as any).QuoteType || 'msp';
      return quoteType.toLowerCase() === schema.QuoteType.toLowerCase();
    });

    if (filteredQuotes.length === 0) {
      alert(`No ${this.getQuoteTypeLabel(schema.QuoteType)} quotes to export`);
      return;
    }

    // Build CSV content
    const columns = schema.columns || [];
    if (columns.length === 0) {
      alert('Export schema has no columns configured');
      return;
    }

    // Headers
    const headers = columns.map(col => this.escapeCSV(col.ExportHeader));
    const csvRows = [headers.join(',')];

    // Data rows
    for (const quote of filteredQuotes) {
      const row = columns.map(col => {
        const value = this.getQuoteFieldValue(quote, col.SourceField, col.FormatType);
        return this.escapeCSV(value);
      });
      csvRows.push(row.join(','));
    }

    // Create and download file
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const filename = `quotes_${schema.QuoteType}_${new Date().toISOString().split('T')[0]}.csv`;
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  getQuoteFieldValue(quote: Quote, field: string, formatType?: string): string {
    // Handle both camelCase and PascalCase
    const value = (quote as any)[field] ?? (quote as any)[this.toCamelCase(field)];
    
    if (value === null || value === undefined) {
      return '';
    }

    // Format based on type
    switch (formatType) {
      case 'currency':
        return typeof value === 'number' ? `$${value.toFixed(2)}` : String(value);
      case 'date':
        if (value instanceof Date) {
          return value.toLocaleDateString();
        }
        if (typeof value === 'string' && value.includes('T')) {
          return new Date(value).toLocaleDateString();
        }
        return String(value);
      case 'datetime':
        if (value instanceof Date) {
          return value.toLocaleString();
        }
        if (typeof value === 'string' && value.includes('T')) {
          return new Date(value).toLocaleString();
        }
        return String(value);
      case 'boolean':
        return value ? 'Yes' : 'No';
      case 'number':
        return String(value);
      default:
        return String(value);
    }
  }

  toCamelCase(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1);
  }

  escapeCSV(value: string): string {
    if (value === null || value === undefined) {
      return '';
    }
    const str = String(value);
    // If contains comma, newline, or quote, wrap in quotes and escape internal quotes
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
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
    const id = this.getQuoteId(quote);
    if (!id) return;
    this.editingQuoteId = id;
    this.quoteDrafts[id] = JSON.parse(JSON.stringify(quote)) as Quote;
  }

  cancelEditQuote(quoteId: string): void {
    if (this.editingQuoteId === quoteId) {
      this.editingQuoteId = null;
    }
    delete this.quoteDrafts[quoteId];
  }

  saveEditQuote(quote: Quote): void {
    const id = this.getQuoteId(quote);
    const draft = this.quoteDrafts[id];
    if (!draft) return;

    const customerName = draft.customerName || '';
    if (!customerName.trim()) {
      alert('Customer name is required.');
      return;
    }

    const updates: Partial<Quote> = {
      customerName: customerName.trim(),
      notes: (draft.notes || '').trim()
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
      updates.selectedOptions = (draft.selectedOptions || []).map((option: any) => ({
        ...option,
        monthlyPrice: this.toNumber(option.monthlyPrice),
        name: (option.name || '').trim()
      }));
    } else {
      updates.totalHours = this.toNumber(draft.totalHours ?? 0);
      updates.totalPrice = this.toNumber(draft.totalPrice);
      updates.workItems = (draft.workItems || []).map((item: any) => ({
        ...item,
        name: (item.name || '').trim(),
        switchCount: this.toNumber(item.switchCount),
        hoursPerSwitch: this.toNumber(item.hoursPerSwitch),
        ratePerHour: this.toNumber(item.ratePerHour),
        lineHours: this.toNumber(item.lineHours),
        lineTotal: this.toNumber(item.lineTotal)
      }));
    }

    const updateId = this.getQuoteId(quote);
    this.quoteService.updateQuote(updateId, updates);
    this.cancelEditQuote(updateId);
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
    const qId = this.getQuoteId(quote);
    const filter = this.laborSectionFilters[qId] || 'All';
    if (filter === 'All') {
      return items;
    }
    return items.filter(item => item.section === filter);
  }

  approveQuote(quoteId: string): void {
    this.quoteService.updateQuoteStatus(quoteId, 'approved')
      .subscribe({
        next: () => alert('Quote approved successfully!'),
        error: (error) => alert('Error approving quote: ' + (error?.error?.message || 'Unknown error'))
      });
  }

  denyQuote(quoteId: string): void {
    this.quoteService.updateQuoteStatus(quoteId, 'denied')
      .subscribe({
        next: () => alert('Quote denied.'),
        error: (error) => alert('Error denying quote: ' + (error?.error?.message || 'Unknown error'))
      });
  }

  deleteQuote(quoteId: string): void {
    if (confirm('Are you sure you want to delete this quote?')) {
      this.quoteService.deleteQuote(quoteId).subscribe({
        next: () => {
          alert('Quote deleted successfully!');
          // Collapse expanded view if this quote was expanded
          if (this.expandedQuoteId === quoteId) {
            this.expandedQuoteId = null;
          }
        },
        error: (error) => alert('Error deleting quote: ' + (error?.error?.message || 'Unknown error'))
      });
    }
  }

  /**
   * Generate Statement of Work (SOW) document for approved quote
   * Uses the Word template and saves to database
   */
  async generateSOW(quote: Quote): Promise<void> {
    console.log('[QuoteManagement] Generating SOW for quote:', quote.id || quote.Id);
    
    if (this.sowGenerating) {
      alert('SOW generation already in progress. Please wait.');
      return;
    }
    
    this.sowGenerating = true;
    
    try {
      // Generate and save to database
      const savedDoc = await this.sowGeneratorService.generateAndSaveSOW(quote);
      
      // Also download the file
      await this.sowGeneratorService.downloadSOW(quote);
      
      alert(`SOW document generated successfully!\n\nFile: ${savedDoc.FileName}\n\nThe document has been downloaded and saved to the SOW Documents list.`);
    } catch (error: any) {
      console.error('[QuoteManagement] SOW generation error:', error);
      alert(`Failed to generate SOW: ${error.message || 'Unknown error'}\n\nPlease ensure the Word template file exists at templates/Template-Druva M365 MSP Agreement.docx`);
    } finally {
      this.sowGenerating = false;
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
