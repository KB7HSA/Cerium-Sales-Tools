import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { FRNStatusService, FRNStatusRecord } from '../../shared/services/frn-status.service';

interface CountItem {
  name: string;
  count: number;
  percentage: number;
}

interface YearBreakdown {
  year: string;
  count: number;
  totalFunding: number;
}

interface ProviderSummary {
  name: string;
  count: number;
  totalFunding: number;
  avgDiscount: number;
  states: string[];
  yearBreakdowns: YearBreakdown[];
  expanded: boolean;
}

@Component({
  selector: 'app-frn-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-2xl font-semibold text-gray-800 dark:text-white/90">FRN Status Dashboard</h2>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Overview of Funding Request Numbers by Service Provider
            </p>
          </div>
          <div class="flex items-center gap-3">
            <!-- Service Type Filter -->
            <select
              [(ngModel)]="serviceTypeFilter"
              (ngModelChange)="onFilterChange()"
              class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="">All Service Types</option>
              <option *ngFor="let st of allServiceTypes" [value]="st">{{ st }}</option>
            </select>
            <a
              routerLink="/e-rate/frn-status"
              class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path>
              </svg>
              View All FRNs
            </a>
          </div>
        </div>

        <!-- Active Filter Indicator -->
        <div *ngIf="serviceTypeFilter" class="mt-3 flex items-center gap-2">
          <span class="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
            <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
            {{ serviceTypeFilter }}
            <button (click)="serviceTypeFilter = ''; onFilterChange()" class="ml-1 hover:text-purple-900 dark:hover:text-purple-200">&times;</button>
          </span>
          <span class="text-xs text-gray-500 dark:text-gray-400">{{ filteredRecords.length }} of {{ records.length }} FRNs</span>
        </div>

        <!-- Summary Stats -->
        <div class="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div class="rounded-xl bg-blue-50 p-4 dark:bg-blue-900/20">
            <p class="text-sm text-blue-600 dark:text-blue-400">Total FRNs</p>
            <p class="mt-1 text-2xl font-bold text-blue-700 dark:text-blue-300">{{ totalRecords | number }}</p>
          </div>
          <div class="rounded-xl bg-green-50 p-4 dark:bg-green-900/20">
            <p class="text-sm text-green-600 dark:text-green-400">Total Funding</p>
            <p class="mt-1 text-2xl font-bold text-green-700 dark:text-green-300">{{ formatCurrencyShort(totalFunding) }}</p>
          </div>
          <div class="rounded-xl bg-purple-50 p-4 dark:bg-purple-900/20">
            <p class="text-sm text-purple-600 dark:text-purple-400">Service Providers</p>
            <p class="mt-1 text-2xl font-bold text-purple-700 dark:text-purple-300">{{ providerSummaries.length }}</p>
          </div>
          <div class="rounded-xl bg-orange-50 p-4 dark:bg-orange-900/20">
            <p class="text-sm text-orange-600 dark:text-orange-400">Funding Years</p>
            <p class="mt-1 text-2xl font-bold text-orange-700 dark:text-orange-300">{{ allFundingYears.length }}</p>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="flex items-center justify-center p-12">
        <svg class="h-8 w-8 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span class="ml-3 text-gray-600 dark:text-gray-400">Loading data...</span>
      </div>

      <!-- Service Provider Table with Funding Year Breakdown -->
      <div *ngIf="!loading && providerSummaries.length > 0" class="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div class="flex items-center justify-between border-b border-gray-200 p-6 pb-4 dark:border-gray-700">
          <h3 class="text-lg font-semibold text-gray-800 dark:text-white">Total Funding by Service Provider &amp; Funding Year</h3>
          <span class="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            {{ providerSummaries.length }} providers
          </span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Service Provider</th>
                <th class="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">States</th>
                <th class="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">FRNs</th>
                <th *ngFor="let yr of allFundingYears" class="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                  FY {{ yr }}
                </th>
                <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Total Funding</th>
                <th class="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Avg Disc%</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
              <ng-container *ngFor="let provider of providerSummaries; let i = index">
                <!-- Provider Row -->
                <tr
                  class="cursor-pointer transition-colors"
                  [ngClass]="{ 'bg-blue-50/50 dark:bg-blue-900/10': provider.expanded, 'hover:bg-gray-50 dark:hover:bg-gray-800/50': !provider.expanded }"
                  (click)="provider.expanded = !provider.expanded"
                >
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-2">
                      <svg class="h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200" [class.rotate-90]="provider.expanded" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                      </svg>
                      <span class="text-sm font-medium text-gray-800 dark:text-white truncate max-w-[250px]" [title]="provider.name">
                        {{ provider.name || 'Not Specified' }}
                      </span>
                    </div>
                  </td>
                  <td class="px-3 py-3 text-xs text-gray-500 dark:text-gray-400">{{ provider.states.join(', ') }}</td>
                  <td class="px-3 py-3 text-right">
                    <span class="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      {{ provider.count | number }}
                    </span>
                  </td>
                  <td *ngFor="let yr of allFundingYears" class="px-3 py-3 text-right text-sm text-gray-600 dark:text-gray-400">
                    <span *ngIf="getYearFunding(provider, yr) > 0" class="text-green-700 dark:text-green-400 font-medium">
                      {{ formatCurrencyShort(getYearFunding(provider, yr)) }}
                    </span>
                    <span *ngIf="getYearFunding(provider, yr) === 0" class="text-gray-300 dark:text-gray-600">—</span>
                  </td>
                  <td class="px-4 py-3 text-right text-sm font-semibold text-green-700 dark:text-green-400">
                    {{ formatCurrencyShort(provider.totalFunding) }}
                  </td>
                  <td class="px-3 py-3 text-right text-sm text-gray-600 dark:text-gray-400">
                    {{ provider.avgDiscount | number:'1.0-0' }}%
                  </td>
                </tr>

                <!-- Expanded Year Breakdown -->
                <tr *ngIf="provider.expanded">
                  <td [attr.colspan]="4 + allFundingYears.length + 2" class="bg-gray-50/80 px-4 py-0 dark:bg-gray-800/30">
                    <div class="py-3 pl-6">
                      <table class="w-full">
                        <thead>
                          <tr>
                            <th class="pb-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Funding Year</th>
                            <th class="pb-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Records</th>
                            <th class="pb-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Funding Amount</th>
                            <th class="pb-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">% of Provider Total</th>
                            <th class="pb-2 w-1/3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 pl-4"></th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr *ngFor="let yb of provider.yearBreakdowns" class="border-t border-gray-200 dark:border-gray-700">
                            <td class="py-2 text-sm font-medium text-gray-700 dark:text-gray-300">FY {{ yb.year }}</td>
                            <td class="py-2 text-right text-sm text-gray-600 dark:text-gray-400">{{ yb.count | number }}</td>
                            <td class="py-2 text-right text-sm font-medium text-green-700 dark:text-green-400">{{ formatCurrencyShort(yb.totalFunding) }}</td>
                            <td class="py-2 text-right text-sm text-gray-500 dark:text-gray-400">
                              {{ provider.totalFunding > 0 ? ((yb.totalFunding / provider.totalFunding) * 100 | number:'1.1-1') : '0.0' }}%
                            </td>
                            <td class="py-2 pl-4">
                              <div class="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                                <div
                                  class="h-full rounded-full bg-green-500 transition-all duration-300"
                                  [style.width.%]="provider.totalFunding > 0 ? (yb.totalFunding / provider.totalFunding) * 100 : 0"
                                ></div>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                        <tfoot>
                          <tr class="border-t-2 border-gray-300 dark:border-gray-600">
                            <td class="py-2 text-sm font-semibold text-gray-800 dark:text-white">Total</td>
                            <td class="py-2 text-right text-sm font-semibold text-gray-800 dark:text-white">{{ provider.count | number }}</td>
                            <td class="py-2 text-right text-sm font-bold text-green-700 dark:text-green-400">{{ formatCurrencyShort(provider.totalFunding) }}</td>
                            <td class="py-2 text-right text-sm font-semibold text-gray-500">100%</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </td>
                </tr>
              </ng-container>

              <!-- Grand Total Row -->
              <tr class="border-t-2 border-gray-300 bg-gray-50 font-semibold dark:border-gray-600 dark:bg-gray-800/50">
                <td class="px-4 py-3 text-sm text-gray-800 dark:text-white">Grand Total</td>
                <td class="px-3 py-3"></td>
                <td class="px-3 py-3 text-right">
                  <span class="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    {{ totalRecords | number }}
                  </span>
                </td>
                <td *ngFor="let yr of allFundingYears" class="px-3 py-3 text-right text-sm font-semibold text-green-700 dark:text-green-400">
                  {{ formatCurrencyShort(getGrandTotalForYear(yr)) }}
                </td>
                <td class="px-4 py-3 text-right text-sm font-bold text-green-700 dark:text-green-400">
                  {{ formatCurrencyShort(totalFunding) }}
                </td>
                <td class="px-3 py-3"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Charts Grid -->
      <div *ngIf="!loading" class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <!-- FRN Status Breakdown -->
        <div class="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <div class="flex items-center justify-between border-b border-gray-200 pb-4 dark:border-gray-700">
            <h3 class="text-lg font-semibold text-gray-800 dark:text-white">FRN Status Breakdown</h3>
            <span class="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              {{ frnStatusCounts.length }} statuses
            </span>
          </div>

          <div class="mt-4 space-y-4">
            <div *ngFor="let item of frnStatusCounts" class="group">
              <div class="flex items-center justify-between text-sm">
                <span class="font-medium text-gray-700 dark:text-gray-300">{{ item.name }}</span>
                <span class="text-gray-500 dark:text-gray-400">{{ item.count | number }} ({{ item.percentage | number:'1.1-1' }}%)</span>
              </div>
              <div class="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  [ngClass]="{
                    'bg-green-500': item.name === 'Funded',
                    'bg-yellow-500': item.name === 'Pending',
                    'bg-red-500': item.name === 'Denied',
                    'bg-blue-500': item.name === 'Committed',
                    'bg-gray-500': item.name !== 'Funded' && item.name !== 'Pending' && item.name !== 'Denied' && item.name !== 'Committed'
                  }"
                  [style.width.%]="item.percentage"
                ></div>
              </div>
            </div>

            <div *ngIf="frnStatusCounts.length === 0" class="py-8 text-center text-gray-500 dark:text-gray-400">
              No status data available
            </div>
          </div>
        </div>

        <!-- FRNs by State -->
        <div class="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <div class="flex items-center justify-between border-b border-gray-200 pb-4 dark:border-gray-700">
            <h3 class="text-lg font-semibold text-gray-800 dark:text-white">FRNs by State</h3>
            <span class="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
              {{ stateCounts.length }} states
            </span>
          </div>

          <div class="mt-4 space-y-4">
            <div *ngFor="let item of stateCounts" class="group">
              <div class="flex items-center justify-between text-sm">
                <span class="font-medium text-gray-700 dark:text-gray-300">{{ item.name }}</span>
                <span class="text-gray-500 dark:text-gray-400">{{ item.count | number }} ({{ item.percentage | number:'1.1-1' }}%)</span>
              </div>
              <div class="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  class="h-full rounded-full bg-green-500 transition-all duration-500"
                  [style.width.%]="item.percentage"
                ></div>
              </div>
            </div>

            <div *ngIf="stateCounts.length === 0" class="py-8 text-center text-gray-500 dark:text-gray-400">
              No state data available
            </div>
          </div>
        </div>

        <!-- FRNs by Service Type -->
        <div class="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <div class="flex items-center justify-between border-b border-gray-200 pb-4 dark:border-gray-700">
            <h3 class="text-lg font-semibold text-gray-800 dark:text-white">FRNs by Service Type</h3>
            <span class="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
              {{ serviceTypeCounts.length }} types
            </span>
          </div>

          <div class="mt-4 max-h-[400px] space-y-4 overflow-y-auto pr-2">
            <div *ngFor="let item of serviceTypeCounts" class="group">
              <div class="flex items-center justify-between text-sm">
                <span class="font-medium text-gray-700 dark:text-gray-300 truncate" [title]="item.name">{{ item.name || 'Not Specified' }}</span>
                <span class="ml-2 flex-shrink-0 text-gray-500 dark:text-gray-400">{{ item.count | number }} ({{ item.percentage | number:'1.1-1' }}%)</span>
              </div>
              <div class="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  class="h-full rounded-full bg-purple-500 transition-all duration-500"
                  [style.width.%]="item.percentage"
                ></div>
              </div>
            </div>

            <div *ngIf="serviceTypeCounts.length === 0" class="py-8 text-center text-gray-500 dark:text-gray-400">
              No service type data available
            </div>
          </div>
        </div>

        <!-- Funding by State -->
        <div class="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <div class="flex items-center justify-between border-b border-gray-200 pb-4 dark:border-gray-700">
            <h3 class="text-lg font-semibold text-gray-800 dark:text-white">Funding by State</h3>
          </div>

          <div class="mt-4 space-y-4">
            <div *ngFor="let item of stateFunding" class="group">
              <div class="flex items-center justify-between text-sm">
                <span class="font-medium text-gray-700 dark:text-gray-300">{{ item.name }}</span>
                <span class="text-gray-500 dark:text-gray-400">{{ formatCurrencyShort(item.amount) }}</span>
              </div>
              <div class="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  class="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  [style.width.%]="item.percentage"
                ></div>
              </div>
            </div>

            <div *ngIf="stateFunding.length === 0" class="py-8 text-center text-gray-500 dark:text-gray-400">
              No funding data available
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class FRNDashboardComponent implements OnInit, OnDestroy {
  records: FRNStatusRecord[] = [];
  filteredRecords: FRNStatusRecord[] = [];
  loading = false;

  // Filter
  serviceTypeFilter = '';
  allServiceTypes: string[] = [];

  totalRecords = 0;
  totalFunding = 0;
  allFundingYears: string[] = [];
  stateCounts: CountItem[] = [];
  frnStatusCounts: CountItem[] = [];
  serviceTypeCounts: CountItem[] = [];
  providerSummaries: ProviderSummary[] = [];
  stateFunding: { name: string; amount: number; percentage: number }[] = [];

  // Grand total cache per year
  private yearGrandTotals = new Map<string, number>();

  private subscriptions: Subscription[] = [];

  constructor(private frnService: FRNStatusService) {}

  ngOnInit(): void {
    this.subscriptions.push(
      this.frnService.records$.subscribe(records => {
        this.records = records;
        this.extractServiceTypes();
        this.onFilterChange();
      }),
      this.frnService.loading$.subscribe(loading => this.loading = loading)
    );

    // Load data
    this.frnService.loadLatestRefresh().subscribe(refresh => {
      if (refresh) {
        this.frnService.loadRecords(refresh.Id).subscribe();
      } else {
        this.frnService.loadRecords().subscribe();
      }
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private extractServiceTypes(): void {
    const types = new Set<string>();
    this.records.forEach(r => {
      if (r.Form471ServiceTypeName) types.add(r.Form471ServiceTypeName);
    });
    this.allServiceTypes = Array.from(types).sort();
  }

  onFilterChange(): void {
    if (this.serviceTypeFilter) {
      this.filteredRecords = this.records.filter(r => r.Form471ServiceTypeName === this.serviceTypeFilter);
    } else {
      this.filteredRecords = [...this.records];
    }
    this.calculateStats();
  }

  private calculateStats(): void {
    const data = this.filteredRecords;
    this.totalRecords = data.length;

    // Total funding
    this.totalFunding = data.reduce((sum, r) => {
      return sum + (parseFloat(r.FundingCommitmentRequest || '0') || 0);
    }, 0);

    // Collect all funding years
    const yearSet = new Set<string>();
    data.forEach(r => { if (r.FundingYear) yearSet.add(r.FundingYear); });
    this.allFundingYears = Array.from(yearSet).sort();

    // State counts
    const stateMap = new Map<string, number>();
    data.forEach(r => {
      const state = r.State || 'Unknown';
      stateMap.set(state, (stateMap.get(state) || 0) + 1);
    });
    this.stateCounts = Array.from(stateMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: this.totalRecords > 0 ? (count / this.totalRecords) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count);

    // FRN Status counts
    const statusMap = new Map<string, number>();
    data.forEach(r => {
      const status = r.Form471FrnStatusName || 'Unknown';
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    });
    this.frnStatusCounts = Array.from(statusMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: this.totalRecords > 0 ? (count / this.totalRecords) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count);

    // Service type counts
    const typeMap = new Map<string, number>();
    data.forEach(r => {
      const type = r.Form471ServiceTypeName || 'Not Specified';
      typeMap.set(type, (typeMap.get(type) || 0) + 1);
    });
    this.serviceTypeCounts = Array.from(typeMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: this.totalRecords > 0 ? (count / this.totalRecords) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count);

    // Provider summaries with year breakdowns
    const providerMap = new Map<string, {
      count: number;
      totalFunding: number;
      discounts: number[];
      states: Set<string>;
      yearMap: Map<string, { count: number; totalFunding: number }>;
    }>();

    data.forEach(r => {
      const name = r.SpinName || 'Not Specified';
      if (!providerMap.has(name)) {
        providerMap.set(name, { count: 0, totalFunding: 0, discounts: [], states: new Set(), yearMap: new Map() });
      }
      const entry = providerMap.get(name)!;
      entry.count++;
      const amt = parseFloat(r.FundingCommitmentRequest || '0') || 0;
      entry.totalFunding += amt;
      if (r.DisPct) {
        const disc = parseFloat(r.DisPct);
        if (!isNaN(disc)) entry.discounts.push(disc);
      }
      if (r.State) entry.states.add(r.State);

      const year = r.FundingYear || 'Unknown';
      if (!entry.yearMap.has(year)) {
        entry.yearMap.set(year, { count: 0, totalFunding: 0 });
      }
      const yd = entry.yearMap.get(year)!;
      yd.count++;
      yd.totalFunding += amt;
    });

    this.providerSummaries = Array.from(providerMap.entries())
      .map(([name, d]) => ({
        name,
        count: d.count,
        totalFunding: d.totalFunding,
        avgDiscount: d.discounts.length > 0
          ? d.discounts.reduce((a, b) => a + b, 0) / d.discounts.length
          : 0,
        states: Array.from(d.states).sort(),
        yearBreakdowns: Array.from(d.yearMap.entries())
          .map(([year, yd]) => ({ year, count: yd.count, totalFunding: yd.totalFunding }))
          .sort((a, b) => a.year.localeCompare(b.year)),
        expanded: false
      }))
      .sort((a, b) => b.totalFunding - a.totalFunding);

    // Grand totals per year
    this.yearGrandTotals.clear();
    this.allFundingYears.forEach(yr => {
      const total = data.reduce((sum, r) => {
        if (r.FundingYear === yr) {
          return sum + (parseFloat(r.FundingCommitmentRequest || '0') || 0);
        }
        return sum;
      }, 0);
      this.yearGrandTotals.set(yr, total);
    });

    // Funding by state
    const stateFundingMap = new Map<string, number>();
    data.forEach(r => {
      const state = r.State || 'Unknown';
      const amt = parseFloat(r.FundingCommitmentRequest || '0') || 0;
      stateFundingMap.set(state, (stateFundingMap.get(state) || 0) + amt);
    });
    const maxStateFunding = Math.max(...Array.from(stateFundingMap.values()), 1);
    this.stateFunding = Array.from(stateFundingMap.entries())
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: (amount / maxStateFunding) * 100
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  getYearFunding(provider: ProviderSummary, year: string): number {
    const yb = provider.yearBreakdowns.find(y => y.year === year);
    return yb ? yb.totalFunding : 0;
  }

  getGrandTotalForYear(year: string): number {
    return this.yearGrandTotals.get(year) || 0;
  }

  formatCurrencyShort(value: number): string {
    if (value >= 1_000_000_000) {
      return '$' + (value / 1_000_000_000).toFixed(1) + 'B';
    } else if (value >= 1_000_000) {
      return '$' + (value / 1_000_000).toFixed(1) + 'M';
    } else if (value >= 1_000) {
      return '$' + (value / 1_000).toFixed(0) + 'K';
    }
    return '$' + value.toFixed(0);
  }
}
