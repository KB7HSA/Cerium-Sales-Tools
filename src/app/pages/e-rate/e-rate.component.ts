import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ERateService, Form470Record, RefreshHistory } from '../../shared/services/erate.service';

@Component({
  selector: 'app-e-rate',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <!-- Header Section -->
      <div class="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-2xl font-semibold text-gray-800 dark:text-white/90">E-Rate Opportunities</h2>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
              USAC Form 470 data for ID, WA, OR, MT, AK - Funding Year 2026
            </p>
          </div>
          <div class="flex items-center gap-3">
            <!-- Migration Button (only shown if no data) -->
            <button
              *ngIf="records.length === 0 && !loading && !downloading"
              (click)="runMigration()"
              [disabled]="migrating"
              class="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <svg *ngIf="migrating" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <svg *ngIf="!migrating" class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"></path>
              </svg>
              {{ migrating ? 'Setting up...' : 'Setup Database' }}
            </button>
            
            <!-- Download Updates Button -->
            <button
              (click)="downloadUpdates()"
              [disabled]="downloading || loading"
              class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg *ngIf="downloading" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <svg *ngIf="!downloading" class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
              </svg>
              {{ downloading ? 'Downloading...' : 'Download Updates' }}
            </button>
          </div>
        </div>
        
        <!-- Last Refresh Info -->
        <div *ngIf="lastRefresh" class="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <span>
            Last refresh: {{ lastRefresh.RefreshCompletedAt | date:'medium' }}
          </span>
          <span *ngIf="lastRefresh.TotalFetched != null">
            {{ lastRefresh.TotalFetched }} records
          </span>
          <span *ngIf="(lastRefresh.TotalNew ?? 0) > 0" class="text-blue-600 font-medium">
            {{ lastRefresh.TotalNew }} new
          </span>
        </div>
        
        <!-- Error Message -->
        <div *ngIf="error" class="mt-4 rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
          <div class="flex items-center gap-2 text-red-700 dark:text-red-400">
            <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
            </svg>
            <span>{{ error }}</span>
            <button (click)="clearError()" class="ml-auto text-red-500 hover:text-red-700">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
        
        <!-- Success Message for new records -->
        <div *ngIf="newRecordsCount > 0 && !downloading" class="mt-4 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
          <div class="flex items-center gap-2 text-blue-700 dark:text-blue-400">
            <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
            </svg>
            <span>{{ newRecordsCount }} new record{{ newRecordsCount > 1 ? 's' : '' }} highlighted in blue</span>
            <button (click)="clearHighlights()" class="ml-auto text-sm text-blue-600 hover:text-blue-800 underline">
              Clear highlights
            </button>
          </div>
        </div>
      </div>
      
      <!-- Filters Section -->
      <div class="rounded-2xl border border-gray-200 bg-white p-3 sm:p-4 dark:border-gray-800 dark:bg-white/[0.03]">
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-wrap items-center gap-2 sm:gap-4">
          <!-- Search -->
          <div class="col-span-2 sm:col-span-3 lg:flex-1 lg:min-w-[200px]">
            <input
              type="text"
              [(ngModel)]="searchTerm"
              (ngModelChange)="applyFilters()"
              placeholder="Search by entity name, application #..."
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
          
          <!-- State Filter -->
          <select
            [(ngModel)]="stateFilter"
            (ngModelChange)="applyFilters()"
            class="w-full lg:w-auto rounded-lg border border-gray-300 px-2 sm:px-4 py-2 text-xs sm:text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="">All States</option>
            <option value="ID">ID</option>
            <option value="WA">WA</option>
            <option value="OR">OR</option>
            <option value="MT">MT</option>
            <option value="AK">AK</option>
          </select>
          
          <!-- Service Type Filter -->
          <select
            [(ngModel)]="serviceTypeFilter"
            (ngModelChange)="applyFilters()"
            class="w-full lg:w-auto rounded-lg border border-gray-300 px-2 sm:px-4 py-2 text-xs sm:text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="">All Types</option>
            <option *ngFor="let type of serviceTypes" [value]="type">{{ type }}</option>
          </select>
          
          <!-- User Status Filter -->
          <select
            [(ngModel)]="userStatusFilter"
            (ngModelChange)="applyFilters()"
            class="w-full lg:w-auto rounded-lg border border-gray-300 px-2 sm:px-4 py-2 text-xs sm:text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="">All Status</option>
            <option value="__none__">No Status</option>
            <option value="In Process">In Process</option>
            <option value="Reviewing">Reviewing</option>
            <option value="Responded">Responded</option>
            <option value="Bypassed">Bypassed</option>
            <option value="Not Interested">Not Interested</option>
          </select>
          
          <!-- Show New Only Toggle -->
          <label class="inline-flex items-center gap-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              [(ngModel)]="showNewOnly"
              (ngModelChange)="applyFilters()"
              class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span class="hidden sm:inline">Show new only</span>
            <span class="sm:hidden">New</span>
          </label>
          
          <!-- Record Count -->
          <span class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {{ filteredRecords.length }}/{{ records.length }}
          </span>
        </div>
      </div>
      
      <!-- Data Table -->
      <div class="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <!-- Loading State -->
        <div *ngIf="loading" class="flex items-center justify-center p-12">
          <svg class="h-8 w-8 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span class="ml-3 text-gray-600 dark:text-gray-400">Loading records...</span>
        </div>
        
        <!-- Empty State -->
        <div *ngIf="!loading && records.length === 0" class="flex flex-col items-center justify-center p-12">
          <svg class="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          <p class="mt-4 text-gray-600 dark:text-gray-400">No Form 470 records found</p>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-500">Click "Setup Database" then "Download Updates" to fetch data from USAC</p>
        </div>
        
        <!-- Table -->
        <div *ngIf="!loading && records.length > 0" class="overflow-x-auto">
          <table class="w-full table-fixed" [class.select-none]="resizing">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700">
                <th [style.width]="getColumnWidth('status')" class="relative whitespace-nowrap px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 lg:px-4">
                  Status
                  <div class="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400" (mousedown)="onResizeStart($event, 'status')"></div>
                </th>
                <th 
                  [style.width]="getColumnWidth('application')"
                  class="relative cursor-pointer whitespace-nowrap px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 lg:px-4 hidden sm:table-cell"
                  (click)="sortBy('ApplicationNumber')"
                >
                  <div class="flex items-center gap-1">
                    Application #
                    <svg *ngIf="sortColumn === 'ApplicationNumber'" class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path *ngIf="sortDirection === 'asc'" fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd"></path>
                      <path *ngIf="sortDirection === 'desc'" fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                    </svg>
                  </div>
                  <div class="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400" (mousedown)="onResizeStart($event, 'application'); $event.stopPropagation()"></div>
                </th>
                <th 
                  class="relative cursor-pointer px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 lg:px-4"
                  (click)="sortBy('BilledEntityName')"
                >
                  <div class="flex items-center gap-1">
                    Billed Entity
                    <svg *ngIf="sortColumn === 'BilledEntityName'" class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path *ngIf="sortDirection === 'asc'" fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd"></path>
                      <path *ngIf="sortDirection === 'desc'" fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                    </svg>
                  </div>
                  <div class="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400" (mousedown)="onResizeStart($event, 'entity'); $event.stopPropagation()"></div>
                </th>
                <th [style.width]="getColumnWidth('state')" class="relative whitespace-nowrap px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 lg:px-4">
                  <div class="flex items-center gap-1">
                    <span class="cursor-pointer hover:text-gray-700 dark:hover:text-gray-200" (click)="sortBy('BilledEntityState')">State</span>
                    <svg *ngIf="sortColumn === 'BilledEntityState'" class="h-4 w-4 cursor-pointer" fill="currentColor" viewBox="0 0 20 20" (click)="sortBy('BilledEntityState')">
                      <path *ngIf="sortDirection === 'asc'" fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd"></path>
                      <path *ngIf="sortDirection === 'desc'" fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                    </svg>
                    <button (click)="toggleDropdown('BilledEntityState', $event)" class="ml-1 rounded p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700">
                      <svg class="h-4 w-4" [class.text-blue-600]="getColumnFilterCount('BilledEntityState') > 0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
                      </svg>
                    </button>
                    <span *ngIf="getColumnFilterCount('BilledEntityState') > 0" class="ml-0.5 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] text-white">{{ getColumnFilterCount('BilledEntityState') }}</span>
                  </div>
                  <!-- Dropdown -->
                  <div *ngIf="openDropdown === 'BilledEntityState'" class="absolute left-0 top-full z-50 mt-1 w-48 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                    <div class="max-h-64 overflow-y-auto p-2">
                      <button (click)="clearColumnFilter('BilledEntityState')" class="mb-2 w-full rounded px-2 py-1 text-left text-xs text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700">Clear filter</button>
                      <label *ngFor="let state of uniqueStates" class="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <input type="checkbox" [checked]="isColumnFilterSelected('BilledEntityState', state)" (change)="toggleColumnFilter('BilledEntityState', state)" class="h-3.5 w-3.5 rounded border-gray-300 text-blue-600">
                        <span class="text-xs text-gray-700 dark:text-gray-300">{{ state }}</span>
                      </label>
                    </div>
                  </div>
                  <div class="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400" (mousedown)="onResizeStart($event, 'state')"></div>
                </th>
                <th 
                  [style.width]="getColumnWidth('year')"
                  class="relative cursor-pointer whitespace-nowrap px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 lg:px-4 hidden md:table-cell"
                  (click)="sortBy('FundingYear')"
                >
                  <div class="flex items-center gap-1">
                    Year
                    <svg *ngIf="sortColumn === 'FundingYear'" class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path *ngIf="sortDirection === 'asc'" fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd"></path>
                      <path *ngIf="sortDirection === 'desc'" fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                    </svg>
                  </div>
                  <div class="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400" (mousedown)="onResizeStart($event, 'year'); $event.stopPropagation()"></div>
                </th>
                <th 
                  [style.width]="getColumnWidth('contractDate')"
                  class="relative cursor-pointer whitespace-nowrap px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 lg:px-4 hidden lg:table-cell"
                  (click)="sortBy('AllowableContractDate')"
                >
                  <div class="flex items-center gap-1">
                    Contract Date
                    <svg *ngIf="sortColumn === 'AllowableContractDate'" class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path *ngIf="sortDirection === 'asc'" fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd"></path>
                      <path *ngIf="sortDirection === 'desc'" fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                    </svg>
                  </div>
                  <div class="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400" (mousedown)="onResizeStart($event, 'contractDate'); $event.stopPropagation()"></div>
                </th>
                <th [style.width]="getColumnWidth('serviceType')" class="relative whitespace-nowrap px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 lg:px-4 hidden sm:table-cell">
                  <div class="flex items-center gap-1">
                    <span class="cursor-pointer hover:text-gray-700 dark:hover:text-gray-200" (click)="sortBy('ServiceType')">Service Type</span>
                    <svg *ngIf="sortColumn === 'ServiceType'" class="h-4 w-4 cursor-pointer" fill="currentColor" viewBox="0 0 20 20" (click)="sortBy('ServiceType')">
                      <path *ngIf="sortDirection === 'asc'" fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd"></path>
                      <path *ngIf="sortDirection === 'desc'" fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                    </svg>
                    <button (click)="toggleDropdown('ServiceType', $event)" class="ml-1 rounded p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700">
                      <svg class="h-4 w-4" [class.text-blue-600]="getColumnFilterCount('ServiceType') > 0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
                      </svg>
                    </button>
                    <span *ngIf="getColumnFilterCount('ServiceType') > 0" class="ml-0.5 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] text-white">{{ getColumnFilterCount('ServiceType') }}</span>
                  </div>
                  <!-- Dropdown -->
                  <div *ngIf="openDropdown === 'ServiceType'" class="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                    <div class="max-h-64 overflow-y-auto p-2">
                      <button (click)="clearColumnFilter('ServiceType')" class="mb-2 w-full rounded px-2 py-1 text-left text-xs text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700">Clear filter</button>
                      <label *ngFor="let type of uniqueServiceTypes" class="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <input type="checkbox" [checked]="isColumnFilterSelected('ServiceType', type)" (change)="toggleColumnFilter('ServiceType', type)" class="h-3.5 w-3.5 rounded border-gray-300 text-blue-600">
                        <span class="text-xs text-gray-700 dark:text-gray-300 truncate">{{ type }}</span>
                      </label>
                    </div>
                  </div>
                  <div class="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400" (mousedown)="onResizeStart($event, 'serviceType')"></div>
                </th>
                <th [style.width]="getColumnWidth('manufacturer')" class="relative whitespace-nowrap px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 lg:px-4 hidden xl:table-cell">
                  <div class="flex items-center gap-1">
                    <span class="cursor-pointer hover:text-gray-700 dark:hover:text-gray-200" (click)="sortBy('Manufacturer')">Manufacturer</span>
                    <svg *ngIf="sortColumn === 'Manufacturer'" class="h-4 w-4 cursor-pointer" fill="currentColor" viewBox="0 0 20 20" (click)="sortBy('Manufacturer')">
                      <path *ngIf="sortDirection === 'asc'" fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd"></path>
                      <path *ngIf="sortDirection === 'desc'" fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                    </svg>
                    <button (click)="toggleDropdown('Manufacturer', $event)" class="ml-1 rounded p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700">
                      <svg class="h-4 w-4" [class.text-blue-600]="getColumnFilterCount('Manufacturer') > 0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
                      </svg>
                    </button>
                    <span *ngIf="getColumnFilterCount('Manufacturer') > 0" class="ml-0.5 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] text-white">{{ getColumnFilterCount('Manufacturer') }}</span>
                  </div>
                  <!-- Dropdown -->
                  <div *ngIf="openDropdown === 'Manufacturer'" class="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                    <div class="max-h-64 overflow-y-auto p-2">
                      <button (click)="clearColumnFilter('Manufacturer')" class="mb-2 w-full rounded px-2 py-1 text-left text-xs text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700">Clear filter</button>
                      <label *ngFor="let mfr of uniqueManufacturers" class="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <input type="checkbox" [checked]="isColumnFilterSelected('Manufacturer', mfr)" (change)="toggleColumnFilter('Manufacturer', mfr)" class="h-3.5 w-3.5 rounded border-gray-300 text-blue-600">
                        <span class="text-xs text-gray-700 dark:text-gray-300 truncate">{{ mfr }}</span>
                      </label>
                    </div>
                  </div>
                  <div class="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400" (mousedown)="onResizeStart($event, 'manufacturer')"></div>
                </th>
                <th 
                  [style.width]="getColumnWidth('lastModified')"
                  class="relative cursor-pointer whitespace-nowrap px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 lg:px-4 hidden md:table-cell"
                  (click)="sortBy('LastModifiedDateTime')"
                >
                  <div class="flex items-center gap-1">
                    Last Modified
                    <svg *ngIf="sortColumn === 'LastModifiedDateTime'" class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path *ngIf="sortDirection === 'asc'" fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd"></path>
                      <path *ngIf="sortDirection === 'desc'" fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                    </svg>
                  </div>
                  <div class="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400" (mousedown)="onResizeStart($event, 'lastModified'); $event.stopPropagation()"></div>
                </th>
                <th [style.width]="getColumnWidth('links')" class="whitespace-nowrap px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 lg:px-4">
                  Links
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              <tr 
                *ngFor="let record of paginatedRecords; trackBy: trackByPrimaryKey"
                [ngClass]="{
                  'bg-blue-50 dark:bg-blue-900/20': record.IsNew,
                  'hover:bg-gray-50 dark:hover:bg-gray-800/50': !record.IsNew
                }"
              >
                <!-- Status Dropdown -->
                <td class="whitespace-nowrap px-2 py-3 lg:px-4">
                  <div class="flex items-center gap-2">
                    <span 
                      *ngIf="record.IsNew" 
                      class="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-800 dark:bg-blue-800 dark:text-blue-100"
                    >
                      NEW
                    </span>
                    <select
                      [value]="record.UserStatus || ''"
                      (change)="updateRecordStatus(record, $event)"
                      [ngClass]="{
                        'bg-gray-50 border-gray-200 text-gray-500 dark:bg-gray-800 dark:border-gray-600': !record.UserStatus,
                        'bg-yellow-50 border-yellow-300 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-400': record.UserStatus === 'In Process',
                        'bg-green-50 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-400': record.UserStatus === 'Responded',
                        'bg-gray-100 border-gray-400 text-gray-600 dark:bg-gray-700 dark:border-gray-500 dark:text-gray-300': record.UserStatus === 'Bypassed',
                        'bg-purple-50 border-purple-300 text-purple-700 dark:bg-purple-900/30 dark:border-purple-700 dark:text-purple-400': record.UserStatus === 'Reviewing',
                        'bg-red-50 border-red-300 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-400': record.UserStatus === 'Not Interested'
                      }"
                      class="rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">-- Status --</option>
                      <option value="In Process">In Process</option>
                      <option value="Reviewing">Reviewing</option>
                      <option value="Responded">Responded</option>
                      <option value="Bypassed">Bypassed</option>
                      <option value="Not Interested">Not Interested</option>
                    </select>
                  </div>
                </td>
                
                <!-- Application Number -->
                <td class="whitespace-nowrap px-2 py-3 text-sm font-medium text-gray-900 dark:text-white lg:px-4 hidden sm:table-cell">
                  {{ record.ApplicationNumber }}
                </td>
                
                <!-- Billed Entity -->
                <td class="overflow-hidden truncate px-2 py-3 text-sm text-gray-700 dark:text-gray-300 lg:px-4" [title]="record.BilledEntityName">
                  {{ record.BilledEntityName }}
                </td>
                
                <!-- State -->
                <td class="whitespace-nowrap px-2 py-3 text-sm text-gray-600 dark:text-gray-400 lg:px-4">
                  {{ record.BilledEntityState }}
                </td>
                
                <!-- Funding Year -->
                <td class="whitespace-nowrap px-2 py-3 text-sm text-gray-600 dark:text-gray-400 lg:px-4 hidden md:table-cell">
                  {{ record.FundingYear }}
                </td>
                
                <!-- Allowable Contract Date -->
                <td class="whitespace-nowrap px-2 py-3 text-sm text-gray-600 dark:text-gray-400 lg:px-4 hidden lg:table-cell">
                  {{ record.AllowableContractDate | date:'shortDate' }}
                </td>
                
                <!-- Service Type -->
                <td class="overflow-hidden truncate px-2 py-3 text-sm text-gray-600 dark:text-gray-400 lg:px-4 hidden sm:table-cell" [title]="record.ServiceType">
                  {{ record.ServiceType || '-' }}
                </td>
                
                <!-- Manufacturer -->
                <td class="overflow-hidden truncate px-2 py-3 text-sm text-gray-600 dark:text-gray-400 lg:px-4 hidden xl:table-cell" [title]="record.Manufacturer">
                  {{ record.Manufacturer || '-' }}
                </td>
                
                <!-- Last Modified -->
                <td class="whitespace-nowrap px-2 py-3 text-sm text-gray-600 dark:text-gray-400 lg:px-4 hidden md:table-cell">
                  {{ record.LastModifiedDateTime | date:'short' }}
                </td>
                
                <!-- Links -->
                <td class="whitespace-nowrap px-2 py-3 text-sm lg:px-4">
                  <div class="flex items-center gap-2">
                    <a 
                      *ngIf="getFormPdfUrl(record)"
                      [href]="getFormPdfUrl(record)"
                      target="_blank"
                      class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      title="View Form PDF"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                    </a>
                    <a 
                      *ngIf="getRfpDocumentsUrl(record)"
                      [href]="getRfpDocumentsUrl(record)"
                      target="_blank"
                      class="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                      title="View RFP Documents"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
                      </svg>
                    </a>
                    <button 
                      (click)="viewDetails(record)"
                      class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      title="View Details"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Pagination -->
        <div *ngIf="filteredRecords.length > pageSize" class="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-200 px-2 py-3 lg:px-4 dark:border-gray-700">
          <div class="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            Showing {{ (currentPage - 1) * pageSize + 1 }} to {{ Math.min(currentPage * pageSize, filteredRecords.length) }} of {{ filteredRecords.length }}
          </div>
          <div class="flex items-center gap-2">
            <button
              (click)="goToPage(currentPage - 1)"
              [disabled]="currentPage === 1"
              class="rounded-lg border border-gray-300 px-2 sm:px-3 py-1.5 text-xs sm:text-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600"
            >
              Prev
            </button>
            <span class="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              {{ currentPage }}/{{ totalPages }}
            </span>
            <button
              (click)="goToPage(currentPage + 1)"
              [disabled]="currentPage === totalPages"
              class="rounded-lg border border-gray-300 px-2 sm:px-3 py-1.5 text-xs sm:text-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600"
            >
              Next
            </button>
          </div>
        </div>
      </div>
      
      <!-- Details Modal -->
      <div *ngIf="selectedRecord" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div class="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 dark:bg-gray-900">
          <div class="flex items-center justify-between border-b border-gray-200 pb-4 dark:border-gray-700">
            <h3 class="text-xl font-semibold text-gray-800 dark:text-white">
              Form 470 Details - {{ selectedRecord.ApplicationNumber }}
            </h3>
            <button (click)="closeDetails()" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          
          <div class="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
            <!-- Form Info -->
            <div>
              <h4 class="mb-3 font-semibold text-gray-700 dark:text-gray-300">Form Information</h4>
              <dl class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <dt class="text-gray-500 dark:text-gray-400">Application #</dt>
                  <dd class="text-gray-900 dark:text-white">{{ selectedRecord.ApplicationNumber }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-gray-500 dark:text-gray-400">Nickname</dt>
                  <dd class="text-gray-900 dark:text-white">{{ selectedRecord.FormNickname || '-' }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-gray-500 dark:text-gray-400">Form Version</dt>
                  <dd class="text-gray-900 dark:text-white">{{ selectedRecord.FormVersion || '-' }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-gray-500 dark:text-gray-400">Funding Year</dt>
                  <dd class="text-gray-900 dark:text-white">{{ selectedRecord.FundingYear }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-gray-500 dark:text-gray-400">Status</dt>
                  <dd class="text-gray-900 dark:text-white">{{ selectedRecord.Fcc470Status || '-' }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-gray-500 dark:text-gray-400">Contract Date</dt>
                  <dd class="text-gray-900 dark:text-white">{{ selectedRecord.AllowableContractDate | date:'shortDate' }}</dd>
                </div>
              </dl>
            </div>
            
            <!-- Billed Entity -->
            <div>
              <h4 class="mb-3 font-semibold text-gray-700 dark:text-gray-300">Billed Entity</h4>
              <dl class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <dt class="text-gray-500 dark:text-gray-400">Entity #</dt>
                  <dd class="text-gray-900 dark:text-white">{{ selectedRecord.BilledEntityNumber || '-' }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-gray-500 dark:text-gray-400">Name</dt>
                  <dd class="text-gray-900 dark:text-white">{{ selectedRecord.BilledEntityName || '-' }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-gray-500 dark:text-gray-400">City</dt>
                  <dd class="text-gray-900 dark:text-white">{{ selectedRecord.BilledEntityCity || '-' }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-gray-500 dark:text-gray-400">State</dt>
                  <dd class="text-gray-900 dark:text-white">{{ selectedRecord.BilledEntityState || '-' }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-gray-500 dark:text-gray-400">Email</dt>
                  <dd class="text-gray-900 dark:text-white">{{ selectedRecord.BilledEntityEmail || '-' }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-gray-500 dark:text-gray-400">Phone</dt>
                  <dd class="text-gray-900 dark:text-white">{{ selectedRecord.BilledEntityPhone || '-' }}</dd>
                </div>
              </dl>
            </div>
            
            <!-- Contact Info -->
            <div>
              <h4 class="mb-3 font-semibold text-gray-700 dark:text-gray-300">Contact Information</h4>
              <dl class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <dt class="text-gray-500 dark:text-gray-400">Contact Name</dt>
                  <dd class="text-gray-900 dark:text-white">{{ selectedRecord.ContactName || '-' }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-gray-500 dark:text-gray-400">Email</dt>
                  <dd class="text-gray-900 dark:text-white">{{ selectedRecord.ContactEmail || '-' }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-gray-500 dark:text-gray-400">Phone</dt>
                  <dd class="text-gray-900 dark:text-white">{{ selectedRecord.ContactPhone || '-' }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-gray-500 dark:text-gray-400">Technical Contact</dt>
                  <dd class="text-gray-900 dark:text-white">{{ selectedRecord.TechnicalContactName || '-' }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-gray-500 dark:text-gray-400">Tech Email</dt>
                  <dd class="text-gray-900 dark:text-white">{{ selectedRecord.TechnicalContactEmail || '-' }}</dd>
                </div>
              </dl>
            </div>
            
            <!-- Service Details -->
            <div>
              <h4 class="mb-3 font-semibold text-gray-700 dark:text-gray-300">Service Details</h4>
              <dl class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <dt class="text-gray-500 dark:text-gray-400">Category</dt>
                  <dd class="text-gray-900 dark:text-white">{{ selectedRecord.ServiceCategory || '-' }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-gray-500 dark:text-gray-400">Service Type</dt>
                  <dd class="text-gray-900 dark:text-white">{{ selectedRecord.ServiceType || '-' }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-gray-500 dark:text-gray-400">Function</dt>
                  <dd class="text-gray-900 dark:text-white">{{ selectedRecord.Function || '-' }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-gray-500 dark:text-gray-400">Manufacturer</dt>
                  <dd class="text-gray-900 dark:text-white">{{ selectedRecord.Manufacturer || '-' }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-gray-500 dark:text-gray-400">Quantity</dt>
                  <dd class="text-gray-900 dark:text-white">{{ selectedRecord.Quantity || '-' }} {{ selectedRecord.Unit || '' }}</dd>
                </div>
              </dl>
            </div>
          </div>
          
          <div class="mt-6 flex justify-end gap-3">
            <a 
              *ngIf="getFormPdfUrl(selectedRecord)"
              [href]="getFormPdfUrl(selectedRecord)"
              target="_blank"
              class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              View Form PDF
            </a>
            <button 
              (click)="closeDetails()"
              class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ERateComponent implements OnInit, OnDestroy {
  Math = Math; // For template access
  
  records: Form470Record[] = [];
  filteredRecords: Form470Record[] = [];
  paginatedRecords: Form470Record[] = [];
  
  loading = false;
  downloading = false;
  migrating = false;
  error: string | null = null;
  
  lastRefresh: RefreshHistory | null = null;
  newRecordsCount = 0;
  
  // Filters
  searchTerm = '';
  stateFilter = '';
  serviceTypeFilter = '';
  userStatusFilter = '';
  showNewOnly = false;
  
  // Sorting
  sortColumn: string = 'AllowableContractDate';
  sortDirection: 'asc' | 'desc' = 'desc';
  
  // Column filter dropdowns
  openDropdown: string | null = null;
  columnFilters: { [key: string]: string[] } = {
    BilledEntityState: [],
    FundingYear: [],
    ServiceType: [],
    Manufacturer: [],
    Fcc470Status: []
  };
  
  // Unique values for column filters
  uniqueStates: string[] = [];
  uniqueYears: string[] = [];
  uniqueServiceTypes: string[] = [];
  uniqueManufacturers: string[] = [];
  uniqueStatuses: string[] = [];
  
  // Pagination
  currentPage = 1;
  pageSize = 25;
  totalPages = 1;
  
  // Service types for filter dropdown
  serviceTypes: string[] = [];
  
  // Detail view
  selectedRecord: Form470Record | null = null;
  
  // Column resizing
  columnWidths: { [key: string]: number } = {
    status: 130,
    application: 120,
    entity: 0, // 0 means auto/flex
    state: 80,
    year: 70,
    contractDate: 110,
    serviceType: 150,
    manufacturer: 160,
    lastModified: 140,
    links: 80
  };
  resizing: { column: string; startX: number; startWidth: number } | null = null;
  
  private subscriptions: Subscription[] = [];
  private resizeMoveListener: ((e: MouseEvent) => void) | null = null;
  private resizeEndListener: ((e: MouseEvent) => void) | null = null;

  constructor(private erateService: ERateService) {}

  ngOnInit(): void {
    // Subscribe to service state
    this.subscriptions.push(
      this.erateService.records$.subscribe(records => {
        this.records = records;
        this.extractServiceTypes();
        this.applyFilters();
        this.updateNewRecordsCount();
      }),
      this.erateService.loading$.subscribe(loading => this.loading = loading),
      this.erateService.downloading$.subscribe(downloading => this.downloading = downloading),
      this.erateService.error$.subscribe(error => this.error = error),
      this.erateService.lastRefresh$.subscribe(refresh => this.lastRefresh = refresh)
    );
    
    // Load initial data
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

  downloadUpdates(): void {
    this.erateService.downloadUpdates().subscribe();
  }

  runMigration(): void {
    this.migrating = true;
    this.erateService.runMigration().subscribe({
      next: (result) => {
        this.migrating = false;
        if (result) {
          console.log('Migration completed:', result.results);
        }
      },
      error: () => {
        this.migrating = false;
      }
    });
  }

  applyFilters(): void {
    let filtered = [...this.records];
    
    // Search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.BilledEntityName?.toLowerCase().includes(term) ||
        r.ApplicationNumber?.toLowerCase().includes(term) ||
        r.BilledEntityCity?.toLowerCase().includes(term) ||
        r.ServiceType?.toLowerCase().includes(term) ||
        r.Manufacturer?.toLowerCase().includes(term)
      );
    }
    
    // State filter
    if (this.stateFilter) {
      filtered = filtered.filter(r => r.BilledEntityState === this.stateFilter);
    }
    
    // Service type filter
    if (this.serviceTypeFilter) {
      filtered = filtered.filter(r => r.ServiceType === this.serviceTypeFilter);
    }
    
    // User status filter
    if (this.userStatusFilter) {
      if (this.userStatusFilter === '__none__') {
        filtered = filtered.filter(r => !r.UserStatus);
      } else {
        filtered = filtered.filter(r => r.UserStatus === this.userStatusFilter);
      }
    }
    
    // New only filter
    if (this.showNewOnly) {
      filtered = filtered.filter(r => r.IsNew);
    }
    
    // Column-specific filters
    Object.keys(this.columnFilters).forEach(column => {
      const filterValues = this.columnFilters[column];
      if (filterValues.length > 0) {
        filtered = filtered.filter(r => {
          const value = (r as any)[column];
          return filterValues.includes(value);
        });
      }
    });
    
    // Apply sorting
    filtered.sort((a, b) => {
      const aVal = (a as any)[this.sortColumn] || '';
      const bVal = (b as any)[this.sortColumn] || '';
      const comparison = aVal.localeCompare(bVal);
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });
    
    this.filteredRecords = filtered;
    this.totalPages = Math.ceil(filtered.length / this.pageSize) || 1;
    this.currentPage = Math.min(this.currentPage, this.totalPages);
    this.updatePaginatedRecords();
  }

  updatePaginatedRecords(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedRecords = this.filteredRecords.slice(start, end);
  }

  sortBy(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.applyFilters();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedRecords();
    }
  }

  extractServiceTypes(): void {
    const types = new Set<string>();
    const states = new Set<string>();
    const years = new Set<string>();
    const manufacturers = new Set<string>();
    const statuses = new Set<string>();
    
    this.records.forEach(r => {
      if (r.ServiceType) types.add(r.ServiceType);
      if (r.BilledEntityState) states.add(r.BilledEntityState);
      if (r.FundingYear) years.add(r.FundingYear);
      if (r.Manufacturer) manufacturers.add(r.Manufacturer);
      if (r.Fcc470Status) statuses.add(r.Fcc470Status);
    });
    
    this.serviceTypes = Array.from(types).sort();
    this.uniqueServiceTypes = Array.from(types).sort();
    this.uniqueStates = Array.from(states).sort();
    this.uniqueYears = Array.from(years).sort();
    this.uniqueManufacturers = Array.from(manufacturers).sort();
    this.uniqueStatuses = Array.from(statuses).sort();
  }

  toggleDropdown(column: string, event: Event): void {
    event.stopPropagation();
    this.openDropdown = this.openDropdown === column ? null : column;
  }

  closeDropdown(): void {
    this.openDropdown = null;
  }

  toggleColumnFilter(column: string, value: string): void {
    const filters = this.columnFilters[column];
    const index = filters.indexOf(value);
    if (index === -1) {
      filters.push(value);
    } else {
      filters.splice(index, 1);
    }
    this.applyFilters();
  }

  isColumnFilterSelected(column: string, value: string): boolean {
    return this.columnFilters[column].includes(value);
  }

  clearColumnFilter(column: string): void {
    this.columnFilters[column] = [];
    this.applyFilters();
  }

  getColumnFilterCount(column: string): number {
    return this.columnFilters[column].length;
  }

  updateNewRecordsCount(): void {
    this.newRecordsCount = this.records.filter(r => r.IsNew).length;
  }

  clearHighlights(): void {
    this.erateService.clearNewHighlights();
    this.newRecordsCount = 0;
  }

  clearError(): void {
    this.error = null;
  }

  updateRecordStatus(record: Form470Record, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const newStatus = select.value;
    
    if (!record.Id) {
      console.error('Cannot update status: Record has no ID');
      return;
    }
    
    // Immediately update local state for responsiveness
    record.UserStatus = newStatus || undefined;
    
    // Update in backend
    this.erateService.updateUserStatus(record.Id, newStatus).subscribe({
      next: (success) => {
        if (!success) {
          // Revert on failure
          select.value = record.UserStatus || '';
        }
      },
      error: () => {
        // Revert on error
        select.value = record.UserStatus || '';
      }
    });
  }  getFormPdfUrl(record: Form470Record): string | null {
    return this.erateService.getFormPdfUrl(record);
  }

  getRfpDocumentsUrl(record: Form470Record): string | null {
    return this.erateService.getRfpDocumentsUrl(record);
  }

  viewDetails(record: Form470Record): void {
    this.selectedRecord = record;
  }

  closeDetails(): void {
    this.selectedRecord = null;
  }

  trackByPrimaryKey(index: number, record: Form470Record): string {
    return record.PrimaryKey;
  }

  // Column resize methods
  onResizeStart(event: MouseEvent, column: string): void {
    event.preventDefault();
    event.stopPropagation();
    
    const currentWidth = this.columnWidths[column] || 100;
    this.resizing = {
      column,
      startX: event.clientX,
      startWidth: currentWidth
    };
    
    // Add global mouse listeners
    this.resizeMoveListener = (e: MouseEvent) => this.onResizeMove(e);
    this.resizeEndListener = (e: MouseEvent) => this.onResizeEnd(e);
    
    document.addEventListener('mousemove', this.resizeMoveListener);
    document.addEventListener('mouseup', this.resizeEndListener);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  onResizeMove(event: MouseEvent): void {
    if (!this.resizing) return;
    
    const diff = event.clientX - this.resizing.startX;
    const newWidth = Math.max(50, this.resizing.startWidth + diff);
    this.columnWidths[this.resizing.column] = newWidth;
  }

  onResizeEnd(event: MouseEvent): void {
    if (this.resizeMoveListener) {
      document.removeEventListener('mousemove', this.resizeMoveListener);
    }
    if (this.resizeEndListener) {
      document.removeEventListener('mouseup', this.resizeEndListener);
    }
    
    this.resizing = null;
    this.resizeMoveListener = null;
    this.resizeEndListener = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

  getColumnWidth(column: string): string {
    const width = this.columnWidths[column];
    return width ? `${width}px` : 'auto';
  }
}

