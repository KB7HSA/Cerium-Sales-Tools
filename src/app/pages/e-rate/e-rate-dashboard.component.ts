import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ERateService, Form470Record } from '../../shared/services/erate.service';

interface CountItem {
  name: string;
  count: number;
  percentage: number;
}

@Component({
  selector: 'app-e-rate-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-2xl font-semibold text-gray-800 dark:text-white/90">E-Rate Dashboard</h2>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Overview of Form 470 opportunities
            </p>
          </div>
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-2">
              <label for="fundingYear" class="text-sm font-medium text-gray-600 dark:text-gray-400">Funding Year:</label>
              <select
                id="fundingYear"
                [(ngModel)]="selectedFundingYear"
                (ngModelChange)="onFundingYearChange()"
                class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
              >
                <option value="all">All Years</option>
                <option *ngFor="let year of fundingYears" [value]="year">{{ year }}</option>
              </select>
            </div>
            <a 
              routerLink="/e-rate"
              class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path>
              </svg>
              View All Opportunities
            </a>
          </div>
        </div>
        
        <!-- Summary Stats -->
        <div class="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div class="rounded-xl bg-blue-50 p-4 dark:bg-blue-900/20">
            <p class="text-sm text-blue-600 dark:text-blue-400">Total Opportunities</p>
            <p class="mt-1 text-2xl font-bold text-blue-700 dark:text-blue-300">{{ totalRecords }}</p>
          </div>
          <div class="rounded-xl bg-green-50 p-4 dark:bg-green-900/20">
            <p class="text-sm text-green-600 dark:text-green-400">States Covered</p>
            <p class="mt-1 text-2xl font-bold text-green-700 dark:text-green-300">{{ stateCounts.length }}</p>
          </div>
          <div class="rounded-xl bg-purple-50 p-4 dark:bg-purple-900/20">
            <p class="text-sm text-purple-600 dark:text-purple-400">Manufacturers</p>
            <p class="mt-1 text-2xl font-bold text-purple-700 dark:text-purple-300">{{ manufacturerCounts.length }}</p>
          </div>
          <div class="rounded-xl bg-orange-50 p-4 dark:bg-orange-900/20">
            <p class="text-sm text-orange-600 dark:text-orange-400">New This Refresh</p>
            <p class="mt-1 text-2xl font-bold text-orange-700 dark:text-orange-300">{{ newRecords }}</p>
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
      
      <!-- Cards Grid -->
      <div *ngIf="!loading" class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <!-- Opportunities by State Card -->
        <div class="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <div class="flex items-center justify-between border-b border-gray-200 pb-4 dark:border-gray-700">
            <h3 class="text-lg font-semibold text-gray-800 dark:text-white">Opportunities by State</h3>
            <span class="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              {{ stateCounts.length }} states
            </span>
          </div>
          
          <div class="mt-4 space-y-4">
            <div *ngFor="let item of stateCounts" class="group">
              <div class="flex items-center justify-between text-sm">
                <span class="font-medium text-gray-700 dark:text-gray-300">{{ item.name }}</span>
                <span class="text-gray-500 dark:text-gray-400">{{ item.count }} ({{ item.percentage | number:'1.1-1' }}%)</span>
              </div>
              <div class="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div 
                  class="h-full rounded-full bg-blue-500 transition-all duration-500"
                  [style.width.%]="item.percentage"
                ></div>
              </div>
            </div>
            
            <div *ngIf="stateCounts.length === 0" class="py-8 text-center text-gray-500 dark:text-gray-400">
              No state data available
            </div>
          </div>
        </div>
        
        <!-- Opportunities by Manufacturer Card -->
        <div class="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <div class="flex items-center justify-between border-b border-gray-200 pb-4 dark:border-gray-700">
            <h3 class="text-lg font-semibold text-gray-800 dark:text-white">Opportunities by Manufacturer</h3>
            <span class="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
              {{ manufacturerCounts.length }} manufacturers
            </span>
          </div>
          
          <div class="mt-4 max-h-[400px] space-y-4 overflow-y-auto pr-2">
            <div *ngFor="let item of manufacturerCounts" class="group">
              <div class="flex items-center justify-between text-sm">
                <span class="font-medium text-gray-700 dark:text-gray-300 truncate" [title]="item.name">{{ item.name || 'Not Specified' }}</span>
                <span class="ml-2 flex-shrink-0 text-gray-500 dark:text-gray-400">{{ item.count }} ({{ item.percentage | number:'1.1-1' }}%)</span>
              </div>
              <div class="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div 
                  class="h-full rounded-full bg-purple-500 transition-all duration-500"
                  [style.width.%]="item.percentage"
                ></div>
              </div>
            </div>
            
            <div *ngIf="manufacturerCounts.length === 0" class="py-8 text-center text-gray-500 dark:text-gray-400">
              No manufacturer data available
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ERateDashboardComponent implements OnInit, OnDestroy {
  records: Form470Record[] = [];
  filteredRecords: Form470Record[] = [];
  loading = false;
  
  selectedFundingYear = 'all';
  fundingYears: string[] = [];
  
  totalRecords = 0;
  newRecords = 0;
  stateCounts: CountItem[] = [];
  manufacturerCounts: CountItem[] = [];
  
  private subscriptions: Subscription[] = [];

  constructor(private erateService: ERateService) {}

  ngOnInit(): void {
    this.subscriptions.push(
      this.erateService.records$.subscribe(records => {
        this.records = records;
        this.buildFundingYears();
        this.applyFilter();
      }),
      this.erateService.loading$.subscribe(loading => this.loading = loading)
    );
    
    // Load data
    this.erateService.loadLatestRefresh().subscribe(refresh => {
      if (refresh) {
        this.erateService.loadRecords(refresh.Id).subscribe();
      } else {
        this.erateService.loadRecords().subscribe();
      }
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  onFundingYearChange(): void {
    this.applyFilter();
  }

  private buildFundingYears(): void {
    const years = new Set<string>();
    this.records.forEach(r => {
      if (r.FundingYear) {
        years.add(r.FundingYear);
      }
    });
    this.fundingYears = Array.from(years).sort((a, b) => b.localeCompare(a));
  }

  private applyFilter(): void {
    this.filteredRecords = this.selectedFundingYear === 'all'
      ? this.records
      : this.records.filter(r => r.FundingYear === this.selectedFundingYear);
    this.calculateStats();
  }

  private calculateStats(): void {
    this.totalRecords = this.filteredRecords.length;
    this.newRecords = this.filteredRecords.filter(r => r.IsNew).length;
    
    // Calculate state counts
    const stateMap = new Map<string, number>();
    this.filteredRecords.forEach(r => {
      const state = r.BilledEntityState || 'Unknown';
      stateMap.set(state, (stateMap.get(state) || 0) + 1);
    });
    
    this.stateCounts = Array.from(stateMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: this.totalRecords > 0 ? (count / this.totalRecords) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count);
    
    // Calculate manufacturer counts
    const mfrMap = new Map<string, number>();
    this.filteredRecords.forEach(r => {
      const mfr = r.Manufacturer || 'Not Specified';
      mfrMap.set(mfr, (mfrMap.get(mfr) || 0) + 1);
    });
    
    this.manufacturerCounts = Array.from(mfrMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: this.totalRecords > 0 ? (count / this.totalRecords) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count);
  }
}
