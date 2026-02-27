import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, timer } from 'rxjs';
import { switchMap, retry } from 'rxjs/operators';
import * as XLSX from 'xlsx';
import { marked } from 'marked';
import { CiscoRenewalsService, HardwareRenewalItem, CustomerSummary } from '../../shared/services/cisco-renewals.service';
import { SoftwareRenewalsService, SoftwareRenewalItem, SoftwareCustomerSummary } from '../../shared/services/software-renewals.service';
import { RenewalsAIService } from '../../shared/services/renewals-ai.service';
import { RenewalsDocxExportService } from '../../shared/services/renewals-docx-export.service';

interface CombinedCustomerSummary {
  customerName: string;
  hwItemCount: number;
  hwTotalQuantity: number;
  hwTotalOpportunity: number;
  hwArchitectures: string[];
  swItemCount: number;
  swTotalQuantity: number;
  swTotalOpportunity: number;
  swTotalListPrice: number;
  swArchitectures: string[];
  totalOpportunity: number;
}

@Component({
  selector: 'app-cisco-renewals-summary',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cisco-renewals-summary.component.html',
})
export class CiscoRenewalsSummaryComponent implements OnInit, OnDestroy {
  // Raw data
  hwItems: HardwareRenewalItem[] = [];
  swItems: SoftwareRenewalItem[] = [];
  loading = true;
  hwLoaded = false;
  swLoaded = false;

  // Customer selection
  customerNames: string[] = [];
  selectedCustomer = '';

  // Filtered data for selected customer
  customerHwItems: HardwareRenewalItem[] = [];
  customerSwItems: SoftwareRenewalItem[] = [];

  // Combined summaries for overview table
  combinedSummaries: CombinedCustomerSummary[] = [];

  // Summary cards (for selected customer or all)
  hwSummary = { items: 0, quantity: 0, opportunity: 0, architectures: [] as string[], productFamilies: [] as string[] };
  swSummary = { items: 0, quantity: 0, opportunity: 0, listPrice: 0, architectures: [] as string[], offerTypes: [] as string[] };

  // Hardware breakdown by architecture
  hwByArchitecture: { architecture: string; itemCount: number; quantity: number; opportunity: number }[] = [];
  // Software breakdown by architecture
  swByArchitecture: { architecture: string; itemCount: number; quantity: number; opportunity: number; listPrice: number }[] = [];
  // Hardware EOL timeline
  hwEolTimeline: { period: string; count: number; opportunity: number }[] = [];
  // Software ending soon
  swEndingSoon: { period: string; count: number; opportunity: number }[] = [];

  // AI Analysis
  aiConfigured = false;
  aiGenerating = false;
  aiContent = '';
  aiRenderedHtml = '';
  aiError = '';
  aiTokens = 0;
  aiPromptTokens = 0;
  aiCompletionTokens = 0;
  aiModel = '';
  aiFinishReason = '';

  // Debug
  showDebug = false;
  debugSystemPrompt = '';
  debugUserPrompt = '';
  debugRequestPayload = '';

  private subscriptions: Subscription[] = [];

  constructor(
    private hwService: CiscoRenewalsService,
    private swService: SoftwareRenewalsService,
    private renewalsAI: RenewalsAIService,
    private docxExport: RenewalsDocxExportService,
  ) {}

  ngOnInit(): void {
    // Check AI status — delay briefly to let MSAL token acquisition finish,
    // then retry once if the first attempt fails (e.g., 401 during MSAL init)
    this.subscriptions.push(
      timer(500).pipe(
        switchMap(() => this.renewalsAI.checkAIStatus())
      ).subscribe(status => {
        this.aiConfigured = status.configured;
        // If initial check failed (likely auth issue), retry after 3s
        if (!status.configured) {
          timer(3000).pipe(
            switchMap(() => this.renewalsAI.checkAIStatus())
          ).subscribe(retryStatus => {
            this.aiConfigured = retryStatus.configured;
          });
        }
      })
    );

    this.subscriptions.push(
      this.hwService.renewals$.subscribe(items => {
        this.hwItems = items;
        if (items.length > 0) {
          this.hwLoaded = true;
          this.checkLoaded();
        }
      }),
      this.swService.renewals$.subscribe(items => {
        this.swItems = items;
        if (items.length > 0) {
          this.swLoaded = true;
          this.checkLoaded();
        }
      })
    );

    this.hwService.loadHardwareRenewals();
    this.swService.loadSoftwareRenewals();

    // Timeout loading state after 10s
    setTimeout(() => {
      if (this.loading) {
        this.loading = false;
        this.buildData();
      }
    }, 10000);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  private checkLoaded(): void {
    if (this.hwLoaded || this.swLoaded) {
      this.loading = false;
      this.buildData();
    }
  }

  private buildData(): void {
    // Build unique customer names from both datasets
    const hwNames = new Set(this.hwItems.map(i => i.installSiteEndCustomerName).filter(n => n));
    const swNames = new Set(this.swItems.map(i => i.installSiteEndCustomerName).filter(n => n));
    const allNames = new Set([...hwNames, ...swNames]);
    this.customerNames = Array.from(allNames).sort();

    // Build combined summaries
    this.buildCombinedSummaries();

    // Apply customer filter
    this.onCustomerChange();
  }

  private buildCombinedSummaries(): void {
    const map = new Map<string, CombinedCustomerSummary>();

    for (const item of this.hwItems) {
      const key = item.installSiteEndCustomerName.toUpperCase().trim();
      if (!key) continue;
      if (!map.has(key)) {
        map.set(key, this.emptySummary(item.installSiteEndCustomerName));
      }
      const s = map.get(key)!;
      s.hwItemCount++;
      s.hwTotalQuantity += item.itemQuantity;
      s.hwTotalOpportunity += item.opportunity;
      if (item.architecture && !s.hwArchitectures.includes(item.architecture)) {
        s.hwArchitectures.push(item.architecture);
      }
    }

    for (const item of this.swItems) {
      const key = item.installSiteEndCustomerName.toUpperCase().trim();
      if (!key) continue;
      if (!map.has(key)) {
        map.set(key, this.emptySummary(item.installSiteEndCustomerName));
      }
      const s = map.get(key)!;
      s.swItemCount++;
      s.swTotalQuantity += item.itemQuantity;
      s.swTotalOpportunity += item.opportunity;
      s.swTotalListPrice += item.fullTermListPrice;
      if (item.architecture && !s.swArchitectures.includes(item.architecture)) {
        s.swArchitectures.push(item.architecture);
      }
    }

    for (const s of map.values()) {
      s.totalOpportunity = s.hwTotalOpportunity + s.swTotalOpportunity;
    }

    this.combinedSummaries = Array.from(map.values()).sort((a, b) => b.totalOpportunity - a.totalOpportunity);
  }

  private emptySummary(name: string): CombinedCustomerSummary {
    return {
      customerName: name,
      hwItemCount: 0, hwTotalQuantity: 0, hwTotalOpportunity: 0, hwArchitectures: [],
      swItemCount: 0, swTotalQuantity: 0, swTotalOpportunity: 0, swTotalListPrice: 0, swArchitectures: [],
      totalOpportunity: 0
    };
  }

  onCustomerChange(): void {
    // Clear AI analysis when customer changes
    this.clearAIAnalysis();

    if (this.selectedCustomer) {
      const key = this.selectedCustomer.toUpperCase().trim();
      this.customerHwItems = this.hwItems.filter(i => i.installSiteEndCustomerName.toUpperCase().trim() === key);
      this.customerSwItems = this.swItems.filter(i => i.installSiteEndCustomerName.toUpperCase().trim() === key);
    } else {
      this.customerHwItems = this.hwItems;
      this.customerSwItems = this.swItems;
    }

    this.computeSummaries();
    this.computeBreakdowns();
  }

  private computeSummaries(): void {
    // Hardware
    this.hwSummary = {
      items: this.customerHwItems.length,
      quantity: this.customerHwItems.reduce((sum, i) => sum + i.itemQuantity, 0),
      opportunity: this.customerHwItems.reduce((sum, i) => sum + i.opportunity, 0),
      architectures: [...new Set(this.customerHwItems.map(i => i.architecture).filter(a => a))],
      productFamilies: [...new Set(this.customerHwItems.map(i => i.productFamily).filter(f => f))],
    };

    // Software
    this.swSummary = {
      items: this.customerSwItems.length,
      quantity: this.customerSwItems.reduce((sum, i) => sum + i.itemQuantity, 0),
      opportunity: this.customerSwItems.reduce((sum, i) => sum + i.opportunity, 0),
      listPrice: this.customerSwItems.reduce((sum, i) => sum + i.fullTermListPrice, 0),
      architectures: [...new Set(this.customerSwItems.map(i => i.architecture).filter(a => a))],
      offerTypes: [...new Set(this.customerSwItems.map(i => i.subscriptionOfferType).filter(t => t && t !== 'UNKNOWN'))],
    };
  }

  private computeBreakdowns(): void {
    // Hardware by architecture
    const hwArchMap = new Map<string, { itemCount: number; quantity: number; opportunity: number }>();
    for (const item of this.customerHwItems) {
      const arch = item.architecture || 'Unknown';
      if (!hwArchMap.has(arch)) hwArchMap.set(arch, { itemCount: 0, quantity: 0, opportunity: 0 });
      const a = hwArchMap.get(arch)!;
      a.itemCount++;
      a.quantity += item.itemQuantity;
      a.opportunity += item.opportunity;
    }
    this.hwByArchitecture = Array.from(hwArchMap.entries())
      .map(([architecture, data]) => ({ architecture, ...data }))
      .sort((a, b) => b.opportunity - a.opportunity);

    // Software by architecture
    const swArchMap = new Map<string, { itemCount: number; quantity: number; opportunity: number; listPrice: number }>();
    for (const item of this.customerSwItems) {
      const arch = item.architecture || 'Unknown';
      if (!swArchMap.has(arch)) swArchMap.set(arch, { itemCount: 0, quantity: 0, opportunity: 0, listPrice: 0 });
      const a = swArchMap.get(arch)!;
      a.itemCount++;
      a.quantity += item.itemQuantity;
      a.opportunity += item.opportunity;
      a.listPrice += item.fullTermListPrice;
    }
    this.swByArchitecture = Array.from(swArchMap.entries())
      .map(([architecture, data]) => ({ architecture, ...data }))
      .sort((a, b) => b.opportunity - a.opportunity);

    // Hardware EOL timeline
    this.hwEolTimeline = this.computeTimeline(
      this.customerHwItems.map(i => ({ dateStr: i.ldos, opportunity: i.opportunity }))
    );

    // Software ending soon
    this.swEndingSoon = this.computeTimeline(
      this.customerSwItems.map(i => ({ dateStr: i.endDate, opportunity: i.opportunity }))
    );
  }

  private computeTimeline(items: { dateStr: string; opportunity: number }[]): { period: string; count: number; opportunity: number }[] {
    const now = new Date();
    const buckets: Record<string, { count: number; opportunity: number }> = {
      'Already Expired': { count: 0, opportunity: 0 },
      'Within 6 months': { count: 0, opportunity: 0 },
      '6-12 months': { count: 0, opportunity: 0 },
      '1-2 years': { count: 0, opportunity: 0 },
      '2+ years': { count: 0, opportunity: 0 },
      'No date': { count: 0, opportunity: 0 },
    };

    for (const item of items) {
      if (!item.dateStr) {
        buckets['No date'].count++;
        buckets['No date'].opportunity += item.opportunity;
        continue;
      }
      const d = new Date(item.dateStr);
      if (isNaN(d.getTime())) {
        buckets['No date'].count++;
        buckets['No date'].opportunity += item.opportunity;
        continue;
      }
      const diffMs = d.getTime() - now.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (diffDays < 0) {
        buckets['Already Expired'].count++;
        buckets['Already Expired'].opportunity += item.opportunity;
      } else if (diffDays <= 182) {
        buckets['Within 6 months'].count++;
        buckets['Within 6 months'].opportunity += item.opportunity;
      } else if (diffDays <= 365) {
        buckets['6-12 months'].count++;
        buckets['6-12 months'].opportunity += item.opportunity;
      } else if (diffDays <= 730) {
        buckets['1-2 years'].count++;
        buckets['1-2 years'].opportunity += item.opportunity;
      } else {
        buckets['2+ years'].count++;
        buckets['2+ years'].opportunity += item.opportunity;
      }
    }

    return Object.entries(buckets)
      .filter(([_, v]) => v.count > 0)
      .map(([period, v]) => ({ period, ...v }));
  }

  selectCustomerFromTable(name: string): void {
    this.selectedCustomer = name;
    this.onCustomerChange();
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  clearCustomer(): void {
    this.selectedCustomer = '';
    this.onCustomerChange();
  }

  get totalCombinedOpportunity(): number {
    return this.hwSummary.opportunity + this.swSummary.opportunity;
  }

  formatCurrency(value: number): string {
    return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  formatNumber(value: number): string {
    return value.toLocaleString('en-US');
  }

  // AI Analysis Methods

  generateAIAnalysis(): void {
    if (!this.selectedCustomer) {
      this.aiError = 'Please select a customer first to generate an AI renewal analysis.';
      return;
    }

    this.aiGenerating = true;
    this.aiError = '';
    this.aiContent = '';
    this.aiRenderedHtml = '';

    this.renewalsAI.generateAnalysis({
      customerName: this.selectedCustomer,
      hardwareItems: this.customerHwItems.map(i => ({
        architecture: i.architecture,
        productFamily: i.productFamily,
        productId: i.productId,
        productDescription: i.productDescription,
        eolDate: i.eolDate,
        ldos: i.ldos,
        itemQuantity: i.itemQuantity,
        opportunity: i.opportunity,
      })),
      softwareItems: this.customerSwItems.map(i => ({
        architecture: i.architecture,
        subscriptionOfferType: i.subscriptionOfferType,
        contractNumber: i.contractNumber,
        contractStatus: i.contractStatus,
        startDate: i.startDate,
        endDate: i.endDate,
        autoRenewTerm: i.autoRenewTerm,
        itemQuantity: i.itemQuantity,
        fullTermListPrice: i.fullTermListPrice,
        opportunity: i.opportunity,
      })),
      hwSummary: this.hwSummary,
      swSummary: this.swSummary,
      hwByArchitecture: this.hwByArchitecture,
      swByArchitecture: this.swByArchitecture,
      hwEolTimeline: this.hwEolTimeline,
      swEndingSoon: this.swEndingSoon,
    }).subscribe({
      next: (result) => {
        this.aiGenerating = false;
        // Always capture debug info regardless of content
        this.aiTokens = result.tokens || 0;
        this.aiPromptTokens = result.promptTokens || 0;
        this.aiCompletionTokens = result.completionTokens || 0;
        this.aiModel = result.model || '';
        this.aiFinishReason = result.finishReason || '';
        this.debugSystemPrompt = result.systemPrompt || '';
        this.debugUserPrompt = result.userPrompt || '';

        if (result.generated && result.content) {
          this.aiContent = result.content;
          this.aiRenderedHtml = marked.parse(result.content) as string;
        } else if (result.generated && !result.content) {
          // API succeeded but returned empty content — likely reasoning model exhausted token budget
          this.aiError = `AI returned empty content (${this.aiCompletionTokens} completion tokens consumed, finish reason: ${this.aiFinishReason || 'unknown'}). ` +
            (this.aiFinishReason === 'length'
              ? 'The model ran out of tokens — reasoning used the entire budget. Try increasing max tokens in the prompt settings.'
              : 'The model produced no output. Try again or check the prompt configuration.');
        } else {
          this.aiError = result.content || 'AI analysis generation failed.';
        }
      },
      error: (error) => {
        console.error('AI analysis HTTP error:', error);
        this.aiGenerating = false;
        this.aiError = error?.error?.message || error?.message || 'AI analysis request failed. Please check your connection and try again.';
      }
    });
  }

  clearAIAnalysis(): void {
    this.aiContent = '';
    this.aiRenderedHtml = '';
    this.aiError = '';
    this.aiTokens = 0;
    this.aiPromptTokens = 0;
    this.aiCompletionTokens = 0;
    this.aiModel = '';
    this.aiFinishReason = '';
    this.debugSystemPrompt = '';
    this.debugUserPrompt = '';
    this.debugRequestPayload = '';
  }

  toggleDebug(): void {
    this.showDebug = !this.showDebug;
  }

  copyAIAnalysis(): void {
    if (this.aiContent) {
      navigator.clipboard.writeText(this.aiContent).then(() => {
        // brief feedback could be added
      });
    }
  }

  exportAIAnalysis(): void {
    if (!this.aiContent) return;
    const blob = new Blob([this.aiContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Renewal_Analysis_${this.selectedCustomer.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  downloadDocx(): void {
    if (!this.aiContent || !this.selectedCustomer) return;
    this.docxExport.exportToDocx({
      customerName: this.selectedCustomer,
      generatedDate: new Date().toISOString().split('T')[0],
      aiContent: this.aiContent,
      hwSummary: this.hwSummary,
      swSummary: this.swSummary,
      hwByArchitecture: this.hwByArchitecture,
      swByArchitecture: this.swByArchitecture,
      hwEolTimeline: this.hwEolTimeline,
      swEndingSoon: this.swEndingSoon,
      aiModel: this.aiModel,
      aiTokens: this.aiTokens,
    });
  }

  exportSummaryToExcel(): void {
    const data = this.combinedSummaries.map(s => ({
      'Customer': s.customerName,
      'HW Line Items': s.hwItemCount,
      'HW Quantity': s.hwTotalQuantity,
      'HW Opportunity': s.hwTotalOpportunity,
      'HW Architectures': s.hwArchitectures.join(', '),
      'SW Line Items': s.swItemCount,
      'SW Quantity': s.swTotalQuantity,
      'SW Opportunity': s.swTotalOpportunity,
      'SW List Price': s.swTotalListPrice,
      'SW Architectures': s.swArchitectures.join(', '),
      'Total Opportunity': s.totalOpportunity,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Renewals Summary');
    const timestamp = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Cisco_Renewals_Summary_${timestamp}.xlsx`);
  }
}
