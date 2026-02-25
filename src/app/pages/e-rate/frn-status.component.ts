import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { FRNStatusService, FRNStatusRecord, FRNRefreshHistory, FRNDownloadProgress } from '../../shared/services/frn-status.service';
import { AuthService } from '../../shared/services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-frn-status',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <!-- Header Section -->
      <div class="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-2xl font-semibold text-gray-800 dark:text-white/90">FRN Status</h2>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
              USAC Funding Request Numbers for ID, WA, OR, MT
            </p>
          </div>
          <div class="flex items-center gap-3">
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

        <!-- Download Progress Bar -->
        <div *ngIf="downloading && downloadProgress" class="mt-4">
          <div class="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-blue-700 dark:text-blue-300">
                {{ downloadProgress.phase === 'fetching' ? 'Fetching from USAC API' : downloadProgress.phase === 'processing' ? 'Processing Records' : 'Working...' }}
              </span>
              <span class="text-sm text-blue-600 dark:text-blue-400">
                {{ getProgressPercentage() }}%
              </span>
            </div>
            <div class="h-2.5 w-full rounded-full bg-blue-200 dark:bg-blue-800">
              <div
                class="h-2.5 rounded-full bg-blue-600 transition-all duration-300 ease-out dark:bg-blue-400"
                [style.width.%]="getProgressPercentage()"
              ></div>
            </div>
            <p class="mt-2 text-xs text-blue-600 dark:text-blue-400">
              {{ downloadProgress.message }}
            </p>
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

        <!-- New records info -->
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
              placeholder="Search by organization, FRN #, service provider..."
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <!-- Funding Year Filter -->
          <select
            [(ngModel)]="fundingYearFilter"
            (ngModelChange)="applyFilters()"
            class="w-full lg:w-auto rounded-lg border border-gray-300 px-2 sm:px-4 py-2 text-xs sm:text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="">All Funding Years</option>
            <option *ngFor="let year of uniqueFundingYears" [value]="year">{{ year }}</option>
          </select>

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
          </select>

          <!-- FRN Status Filter -->
          <select
            [(ngModel)]="frnStatusFilter"
            (ngModelChange)="applyFilters()"
            class="w-full lg:w-auto rounded-lg border border-gray-300 px-2 sm:px-4 py-2 text-xs sm:text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="">All FRN Statuses</option>
            <option *ngFor="let s of uniqueFrnStatuses" [value]="s">{{ s }}</option>
          </select>

          <!-- User Status Filter -->
          <select
            [(ngModel)]="userStatusFilter"
            (ngModelChange)="applyFilters()"
            class="w-full lg:w-auto rounded-lg border border-gray-300 px-2 sm:px-4 py-2 text-xs sm:text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="">All User Status</option>
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
          <p class="mt-4 text-gray-600 dark:text-gray-400">No FRN Status records found</p>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-500">Click "Download Updates" to fetch data from USAC</p>
        </div>

        <!-- Table -->
        <div *ngIf="!loading && records.length > 0" class="overflow-x-auto">
          <table class="w-full table-fixed" [class.select-none]="resizing">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700">
                <!-- Status -->
                <th [style.width]="getColumnWidth('status')" class="relative whitespace-nowrap px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 lg:px-4">
                  Status
                  <div class="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400" (mousedown)="onResizeStart($event, 'status')"></div>
                </th>
                <!-- FRN # -->
                <th
                  [style.width]="getColumnWidth('frn')"
                  class="relative cursor-pointer whitespace-nowrap px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 lg:px-4 hidden sm:table-cell"
                  (click)="sortBy('FundingRequestNumber')"
                >
                  <div class="flex items-center gap-1">
                    FRN #
                    <svg *ngIf="sortColumn === 'FundingRequestNumber'" class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path *ngIf="sortDirection === 'asc'" fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd"></path>
                      <path *ngIf="sortDirection === 'desc'" fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                    </svg>
                  </div>
                  <div class="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400" (mousedown)="onResizeStart($event, 'frn'); $event.stopPropagation()"></div>
                </th>
                <!-- Organization -->
                <th
                  class="relative cursor-pointer px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 lg:px-4"
                  (click)="sortBy('OrganizationName')"
                >
                  <div class="flex items-center gap-1">
                    Organization
                    <svg *ngIf="sortColumn === 'OrganizationName'" class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path *ngIf="sortDirection === 'asc'" fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd"></path>
                      <path *ngIf="sortDirection === 'desc'" fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                    </svg>
                  </div>
                  <div class="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400" (mousedown)="onResizeStart($event, 'organization'); $event.stopPropagation()"></div>
                </th>
                <!-- State -->
                <th [style.width]="getColumnWidth('state')" class="relative whitespace-nowrap px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 lg:px-4">
                  <div class="flex items-center gap-1">
                    <span class="cursor-pointer hover:text-gray-700 dark:hover:text-gray-200" (click)="sortBy('State')">State</span>
                    <svg *ngIf="sortColumn === 'State'" class="h-4 w-4 cursor-pointer" fill="currentColor" viewBox="0 0 20 20" (click)="sortBy('State')">
                      <path *ngIf="sortDirection === 'asc'" fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd"></path>
                      <path *ngIf="sortDirection === 'desc'" fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                    </svg>
                  </div>
                  <div class="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400" (mousedown)="onResizeStart($event, 'state')"></div>
                </th>
                <!-- FRN Status -->
                <th [style.width]="getColumnWidth('frnStatus')" class="relative whitespace-nowrap px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 lg:px-4 hidden md:table-cell">
                  <div class="flex items-center gap-1">
                    <span class="cursor-pointer hover:text-gray-700 dark:hover:text-gray-200" (click)="sortBy('Form471FrnStatusName')">FRN Status</span>
                    <svg *ngIf="sortColumn === 'Form471FrnStatusName'" class="h-4 w-4 cursor-pointer" fill="currentColor" viewBox="0 0 20 20" (click)="sortBy('Form471FrnStatusName')">
                      <path *ngIf="sortDirection === 'asc'" fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd"></path>
                      <path *ngIf="sortDirection === 'desc'" fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                    </svg>
                    <button (click)="toggleDropdown('Form471FrnStatusName', $event)" class="ml-1 rounded p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700">
                      <svg class="h-4 w-4" [class.text-blue-600]="getColumnFilterCount('Form471FrnStatusName') > 0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
                      </svg>
                    </button>
                    <span *ngIf="getColumnFilterCount('Form471FrnStatusName') > 0" class="ml-0.5 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] text-white">{{ getColumnFilterCount('Form471FrnStatusName') }}</span>
                  </div>
                  <!-- Dropdown -->
                  <div *ngIf="openDropdown === 'Form471FrnStatusName'" class="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                    <div class="max-h-64 overflow-y-auto p-2">
                      <button (click)="clearColumnFilter('Form471FrnStatusName')" class="mb-2 w-full rounded px-2 py-1 text-left text-xs text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700">Clear filter</button>
                      <label *ngFor="let val of uniqueFrnStatuses" class="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <input type="checkbox" [checked]="isColumnFilterSelected('Form471FrnStatusName', val)" (change)="toggleColumnFilter('Form471FrnStatusName', val)" class="h-3.5 w-3.5 rounded border-gray-300 text-blue-600">
                        <span class="text-xs text-gray-700 dark:text-gray-300 truncate">{{ val }}</span>
                      </label>
                    </div>
                  </div>
                  <div class="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400" (mousedown)="onResizeStart($event, 'frnStatus')"></div>
                </th>
                <!-- Service Type -->
                <th [style.width]="getColumnWidth('serviceType')" class="relative whitespace-nowrap px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 lg:px-4 hidden lg:table-cell">
                  <div class="flex items-center gap-1">
                    <span class="cursor-pointer hover:text-gray-700 dark:hover:text-gray-200" (click)="sortBy('Form471ServiceTypeName')">Service Type</span>
                    <svg *ngIf="sortColumn === 'Form471ServiceTypeName'" class="h-4 w-4 cursor-pointer" fill="currentColor" viewBox="0 0 20 20" (click)="sortBy('Form471ServiceTypeName')">
                      <path *ngIf="sortDirection === 'asc'" fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd"></path>
                      <path *ngIf="sortDirection === 'desc'" fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                    </svg>
                    <button (click)="toggleDropdown('Form471ServiceTypeName', $event)" class="ml-1 rounded p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700">
                      <svg class="h-4 w-4" [class.text-blue-600]="getColumnFilterCount('Form471ServiceTypeName') > 0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
                      </svg>
                    </button>
                    <span *ngIf="getColumnFilterCount('Form471ServiceTypeName') > 0" class="ml-0.5 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] text-white">{{ getColumnFilterCount('Form471ServiceTypeName') }}</span>
                  </div>
                  <!-- Dropdown -->
                  <div *ngIf="openDropdown === 'Form471ServiceTypeName'" class="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                    <div class="max-h-64 overflow-y-auto p-2">
                      <button (click)="clearColumnFilter('Form471ServiceTypeName')" class="mb-2 w-full rounded px-2 py-1 text-left text-xs text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700">Clear filter</button>
                      <label *ngFor="let val of uniqueServiceTypes" class="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <input type="checkbox" [checked]="isColumnFilterSelected('Form471ServiceTypeName', val)" (change)="toggleColumnFilter('Form471ServiceTypeName', val)" class="h-3.5 w-3.5 rounded border-gray-300 text-blue-600">
                        <span class="text-xs text-gray-700 dark:text-gray-300 truncate">{{ val }}</span>
                      </label>
                    </div>
                  </div>
                  <div class="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400" (mousedown)="onResizeStart($event, 'serviceType')"></div>
                </th>
                <!-- Service Provider -->
                <th [style.width]="getColumnWidth('provider')" class="relative whitespace-nowrap px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 lg:px-4 hidden lg:table-cell">
                  <div class="flex items-center gap-1">
                    <span class="cursor-pointer hover:text-gray-700 dark:hover:text-gray-200" (click)="sortBy('SpinName')">Provider</span>
                    <svg *ngIf="sortColumn === 'SpinName'" class="h-4 w-4 cursor-pointer" fill="currentColor" viewBox="0 0 20 20" (click)="sortBy('SpinName')">
                      <path *ngIf="sortDirection === 'asc'" fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd"></path>
                      <path *ngIf="sortDirection === 'desc'" fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                    </svg>
                    <button (click)="toggleDropdown('SpinName', $event)" class="ml-1 rounded p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700">
                      <svg class="h-4 w-4" [class.text-blue-600]="getColumnFilterCount('SpinName') > 0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
                      </svg>
                    </button>
                    <span *ngIf="getColumnFilterCount('SpinName') > 0" class="ml-0.5 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] text-white">{{ getColumnFilterCount('SpinName') }}</span>
                  </div>
                  <!-- Dropdown -->
                  <div *ngIf="openDropdown === 'SpinName'" class="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                    <div class="max-h-64 overflow-y-auto p-2">
                      <button (click)="clearColumnFilter('SpinName')" class="mb-2 w-full rounded px-2 py-1 text-left text-xs text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700">Clear filter</button>
                      <label *ngFor="let val of uniqueProviders" class="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <input type="checkbox" [checked]="isColumnFilterSelected('SpinName', val)" (change)="toggleColumnFilter('SpinName', val)" class="h-3.5 w-3.5 rounded border-gray-300 text-blue-600">
                        <span class="text-xs text-gray-700 dark:text-gray-300 truncate">{{ val || 'Not Specified' }}</span>
                      </label>
                    </div>
                  </div>
                  <div class="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400" (mousedown)="onResizeStart($event, 'provider')"></div>
                </th>
                <!-- Funding Amount -->
                <th
                  [style.width]="getColumnWidth('funding')"
                  class="relative cursor-pointer whitespace-nowrap px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 lg:px-4 hidden xl:table-cell"
                  (click)="sortBy('FundingCommitmentRequest')"
                >
                  <div class="flex items-center gap-1">
                    Funding Amt
                    <svg *ngIf="sortColumn === 'FundingCommitmentRequest'" class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path *ngIf="sortDirection === 'asc'" fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd"></path>
                      <path *ngIf="sortDirection === 'desc'" fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                    </svg>
                  </div>
                  <div class="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400" (mousedown)="onResizeStart($event, 'funding'); $event.stopPropagation()"></div>
                </th>
                <!-- Discount % -->
                <th
                  [style.width]="getColumnWidth('discount')"
                  class="relative cursor-pointer whitespace-nowrap px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 lg:px-4 hidden xl:table-cell"
                  (click)="sortBy('DisPct')"
                >
                  <div class="flex items-center gap-1">
                    Disc %
                    <svg *ngIf="sortColumn === 'DisPct'" class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path *ngIf="sortDirection === 'asc'" fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd"></path>
                      <path *ngIf="sortDirection === 'desc'" fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                    </svg>
                  </div>
                  <div class="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400" (mousedown)="onResizeStart($event, 'discount'); $event.stopPropagation()"></div>
                </th>
                <!-- Details -->
                <th [style.width]="getColumnWidth('details')" class="whitespace-nowrap px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 lg:px-4">
                  Details
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

                <!-- FRN # -->
                <td class="whitespace-nowrap px-2 py-3 text-sm font-medium text-gray-900 dark:text-white lg:px-4 hidden sm:table-cell">
                  {{ record.FundingRequestNumber }}
                </td>

                <!-- Organization -->
                <td class="overflow-hidden truncate px-2 py-3 text-sm text-gray-700 dark:text-gray-300 lg:px-4" [title]="record.OrganizationName || ''">
                  {{ record.OrganizationName || '-' }}
                </td>

                <!-- State -->
                <td class="whitespace-nowrap px-2 py-3 text-sm text-gray-600 dark:text-gray-400 lg:px-4">
                  {{ record.State || '-' }}
                </td>

                <!-- FRN Status -->
                <td class="whitespace-nowrap px-2 py-3 text-sm lg:px-4 hidden md:table-cell">
                  <span
                    [ngClass]="{
                      'text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-900/20': record.Form471FrnStatusName === 'Funded',
                      'text-yellow-700 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/20': record.Form471FrnStatusName === 'Pending',
                      'text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-900/20': record.Form471FrnStatusName === 'Denied',
                      'text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20': record.Form471FrnStatusName === 'Committed',
                      'text-gray-700 bg-gray-50 dark:text-gray-400 dark:bg-gray-800': !record.Form471FrnStatusName || (record.Form471FrnStatusName !== 'Funded' && record.Form471FrnStatusName !== 'Pending' && record.Form471FrnStatusName !== 'Denied' && record.Form471FrnStatusName !== 'Committed')
                    }"
                    class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                  >
                    {{ record.Form471FrnStatusName || '-' }}
                  </span>
                </td>

                <!-- Service Type -->
                <td class="overflow-hidden truncate px-2 py-3 text-sm text-gray-600 dark:text-gray-400 lg:px-4 hidden lg:table-cell" [title]="record.Form471ServiceTypeName || ''">
                  {{ record.Form471ServiceTypeName || '-' }}
                </td>

                <!-- Service Provider -->
                <td class="overflow-hidden truncate px-2 py-3 text-sm text-gray-600 dark:text-gray-400 lg:px-4 hidden lg:table-cell" [title]="record.SpinName || ''">
                  {{ record.SpinName || '-' }}
                </td>

                <!-- Funding Amount -->
                <td class="whitespace-nowrap px-2 py-3 text-sm text-gray-600 dark:text-gray-400 lg:px-4 hidden xl:table-cell">
                  {{ formatCurrency(record.FundingCommitmentRequest) }}
                </td>

                <!-- Discount % -->
                <td class="whitespace-nowrap px-2 py-3 text-sm text-gray-600 dark:text-gray-400 lg:px-4 hidden xl:table-cell">
                  {{ record.DisPct ? record.DisPct + '%' : '-' }}
                </td>

                <!-- Details -->
                <td class="whitespace-nowrap px-2 py-3 text-sm lg:px-4">
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
        <div class="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-6 dark:bg-gray-900">
          <div class="flex items-center justify-between border-b border-gray-200 pb-4 dark:border-gray-700">
            <h3 class="text-xl font-semibold text-gray-800 dark:text-white">
              FRN Details - {{ selectedRecord.FundingRequestNumber }}
            </h3>
            <button (click)="closeDetails()" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <div class="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <!-- Application Info -->
            <div>
              <h4 class="mb-3 font-semibold text-gray-700 dark:text-gray-300">Application Info</h4>
              <dl class="space-y-2 text-sm">
                <div class="flex justify-between"><dt class="text-gray-500 dark:text-gray-400">Application #</dt><dd class="text-gray-900 dark:text-white">{{ selectedRecord.ApplicationNumber || '-' }}</dd></div>
                <div class="flex justify-between"><dt class="text-gray-500 dark:text-gray-400">FRN #</dt><dd class="text-gray-900 dark:text-white">{{ selectedRecord.FundingRequestNumber || '-' }}</dd></div>
                <div class="flex justify-between"><dt class="text-gray-500 dark:text-gray-400">Funding Year</dt><dd class="text-gray-900 dark:text-white">{{ selectedRecord.FundingYear || '-' }}</dd></div>
                <div class="flex justify-between"><dt class="text-gray-500 dark:text-gray-400">FRN Status</dt><dd class="text-gray-900 dark:text-white">{{ selectedRecord.Form471FrnStatusName || '-' }}</dd></div>
                <div class="flex justify-between"><dt class="text-gray-500 dark:text-gray-400">Nickname</dt><dd class="text-gray-900 dark:text-white">{{ selectedRecord.Nickname || '-' }}</dd></div>
                <div class="flex justify-between"><dt class="text-gray-500 dark:text-gray-400">Form Version</dt><dd class="text-gray-900 dark:text-white">{{ selectedRecord.FormVersion || '-' }}</dd></div>
              </dl>
            </div>

            <!-- Organization Info -->
            <div>
              <h4 class="mb-3 font-semibold text-gray-700 dark:text-gray-300">Organization</h4>
              <dl class="space-y-2 text-sm">
                <div class="flex justify-between"><dt class="text-gray-500 dark:text-gray-400">Organization</dt><dd class="text-gray-900 dark:text-white truncate ml-2" [title]="selectedRecord.OrganizationName">{{ selectedRecord.OrganizationName || '-' }}</dd></div>
                <div class="flex justify-between"><dt class="text-gray-500 dark:text-gray-400">BEN</dt><dd class="text-gray-900 dark:text-white">{{ selectedRecord.Ben || '-' }}</dd></div>
                <div class="flex justify-between"><dt class="text-gray-500 dark:text-gray-400">State</dt><dd class="text-gray-900 dark:text-white">{{ selectedRecord.State || '-' }}</dd></div>
                <div class="flex justify-between"><dt class="text-gray-500 dark:text-gray-400">Entity Type</dt><dd class="text-gray-900 dark:text-white">{{ selectedRecord.OrganizationEntityTypeName || '-' }}</dd></div>
                <div class="flex justify-between"><dt class="text-gray-500 dark:text-gray-400">Contact Email</dt><dd class="text-gray-900 dark:text-white truncate ml-2" [title]="selectedRecord.CnctEmail">{{ selectedRecord.CnctEmail || '-' }}</dd></div>
              </dl>
            </div>

            <!-- Service Provider -->
            <div>
              <h4 class="mb-3 font-semibold text-gray-700 dark:text-gray-300">Service Provider</h4>
              <dl class="space-y-2 text-sm">
                <div class="flex justify-between"><dt class="text-gray-500 dark:text-gray-400">Provider (SPIN)</dt><dd class="text-gray-900 dark:text-white truncate ml-2" [title]="selectedRecord.SpinName">{{ selectedRecord.SpinName || '-' }}</dd></div>
                <div class="flex justify-between"><dt class="text-gray-500 dark:text-gray-400">Service Type</dt><dd class="text-gray-900 dark:text-white">{{ selectedRecord.Form471ServiceTypeName || '-' }}</dd></div>
                <div class="flex justify-between"><dt class="text-gray-500 dark:text-gray-400">Account #</dt><dd class="text-gray-900 dark:text-white">{{ selectedRecord.AccountNumber || '-' }}</dd></div>
                <div class="flex justify-between"><dt class="text-gray-500 dark:text-gray-400">SPAC Filed</dt><dd class="text-gray-900 dark:text-white">{{ selectedRecord.SpacFiled || '-' }}</dd></div>
              </dl>
            </div>

            <!-- Contract Info -->
            <div>
              <h4 class="mb-3 font-semibold text-gray-700 dark:text-gray-300">Contract Info</h4>
              <dl class="space-y-2 text-sm">
                <div class="flex justify-between"><dt class="text-gray-500 dark:text-gray-400">Contract #</dt><dd class="text-gray-900 dark:text-white">{{ selectedRecord.ContractNumber || '-' }}</dd></div>
                <div class="flex justify-between"><dt class="text-gray-500 dark:text-gray-400">Contract Type</dt><dd class="text-gray-900 dark:text-white">{{ selectedRecord.ContractTypeName || '-' }}</dd></div>
                <div class="flex justify-between"><dt class="text-gray-500 dark:text-gray-400">Award Date</dt><dd class="text-gray-900 dark:text-white">{{ selectedRecord.AwardDate || '-' }}</dd></div>
                <div class="flex justify-between"><dt class="text-gray-500 dark:text-gray-400">Service Start</dt><dd class="text-gray-900 dark:text-white">{{ selectedRecord.ServiceStartDate || '-' }}</dd></div>
                <div class="flex justify-between"><dt class="text-gray-500 dark:text-gray-400">Contract Expiry</dt><dd class="text-gray-900 dark:text-white">{{ selectedRecord.ContractExpirationDate || '-' }}</dd></div>
                <div class="flex justify-between"><dt class="text-gray-500 dark:text-gray-400">Establishing 470</dt><dd class="text-gray-900 dark:text-white">{{ selectedRecord.EstablishingForm470 || '-' }}</dd></div>
              </dl>
            </div>

            <!-- Financials -->
            <div>
              <h4 class="mb-3 font-semibold text-gray-700 dark:text-gray-300">Financial Details</h4>
              <dl class="space-y-2 text-sm">
                <div class="flex justify-between"><dt class="text-gray-500 dark:text-gray-400">Pre-Discount Costs</dt><dd class="text-gray-900 dark:text-white">{{ formatCurrency(selectedRecord.TotalPreDiscountCosts) }}</dd></div>
                <div class="flex justify-between"><dt class="text-gray-500 dark:text-gray-400">Discount %</dt><dd class="text-gray-900 dark:text-white">{{ selectedRecord.DisPct ? selectedRecord.DisPct + '%' : '-' }}</dd></div>
                <div class="flex justify-between"><dt class="text-gray-500 dark:text-gray-400">Funding Request</dt><dd class="text-gray-900 dark:text-white font-medium text-green-700 dark:text-green-400">{{ formatCurrency(selectedRecord.FundingCommitmentRequest) }}</dd></div>
                <div class="flex justify-between"><dt class="text-gray-500 dark:text-gray-400">Monthly Recurring</dt><dd class="text-gray-900 dark:text-white">{{ formatCurrency(selectedRecord.TotalMonthlyRecurringCost) }}</dd></div>
                <div class="flex justify-between"><dt class="text-gray-500 dark:text-gray-400">One-Time Costs</dt><dd class="text-gray-900 dark:text-white">{{ formatCurrency(selectedRecord.TotalOneTimeCosts) }}</dd></div>
                <div class="flex justify-between"><dt class="text-gray-500 dark:text-gray-400">Months of Service</dt><dd class="text-gray-900 dark:text-white">{{ selectedRecord.MonthsOfService || '-' }}</dd></div>
              </dl>
            </div>

            <!-- FCDL & Invoicing -->
            <div>
              <h4 class="mb-3 font-semibold text-gray-700 dark:text-gray-300">FCDL & Invoicing</h4>
              <dl class="space-y-2 text-sm">
                <div class="flex justify-between"><dt class="text-gray-500 dark:text-gray-400">FCDL Date</dt><dd class="text-gray-900 dark:text-white">{{ selectedRecord.FcdlLetterDate || '-' }}</dd></div>
                <div class="flex justify-between"><dt class="text-gray-500 dark:text-gray-400">Wave #</dt><dd class="text-gray-900 dark:text-white">{{ selectedRecord.WaveSequenceNumber || '-' }}</dd></div>
                <div class="flex justify-between"><dt class="text-gray-500 dark:text-gray-400">Invoicing Ready</dt><dd class="text-gray-900 dark:text-white">{{ selectedRecord.InvoicingReady || '-' }}</dd></div>
                <div class="flex justify-between"><dt class="text-gray-500 dark:text-gray-400">Invoicing Mode</dt><dd class="text-gray-900 dark:text-white">{{ selectedRecord.InvoicingMode || '-' }}</dd></div>
                <div class="flex justify-between"><dt class="text-gray-500 dark:text-gray-400">Last Invoice Date</dt><dd class="text-gray-900 dark:text-white">{{ selectedRecord.LastDateToInvoice || '-' }}</dd></div>
                <div class="flex justify-between"><dt class="text-gray-500 dark:text-gray-400">Total Disbursed</dt><dd class="text-gray-900 dark:text-white">{{ formatCurrency(selectedRecord.TotalAuthorizedDisbursement) }}</dd></div>
              </dl>
            </div>
          </div>

          <!-- Narrative -->
          <div *ngIf="selectedRecord.Narrative" class="mt-6">
            <h4 class="mb-2 font-semibold text-gray-700 dark:text-gray-300">Narrative</h4>
            <p class="rounded-lg bg-gray-50 p-3 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300">{{ selectedRecord.Narrative }}</p>
          </div>

          <div class="mt-6 flex justify-end">
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
export class FRNStatusComponent implements OnInit, OnDestroy {
  Math = Math;

  records: FRNStatusRecord[] = [];
  filteredRecords: FRNStatusRecord[] = [];
  paginatedRecords: FRNStatusRecord[] = [];

  loading = false;
  downloading = false;
  error: string | null = null;
  downloadProgress: FRNDownloadProgress | null = null;

  lastRefresh: FRNRefreshHistory | null = null;
  newRecordsCount = 0;

  // Filters
  searchTerm = '';
  fundingYearFilter = '';
  stateFilter = '';
  frnStatusFilter = '';
  userStatusFilter = '';
  showNewOnly = false;

  // Sorting
  sortColumn: string = 'FundingRequestNumber';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Column filter dropdowns
  openDropdown: string | null = null;
  columnFilters: { [key: string]: string[] } = {
    Form471FrnStatusName: [],
    Form471ServiceTypeName: [],
    SpinName: []
  };

  // Unique values for column filters
  uniqueFundingYears: string[] = [];
  uniqueFrnStatuses: string[] = [];
  uniqueServiceTypes: string[] = [];
  uniqueProviders: string[] = [];

  // Pagination
  currentPage = 1;
  pageSize = 25;
  totalPages = 1;

  // Detail view
  selectedRecord: FRNStatusRecord | null = null;

  // Column resizing
  columnWidths: { [key: string]: number } = {
    status: 130,
    frn: 120,
    organization: 0, // 0 = auto/flex
    state: 65,
    frnStatus: 130,
    serviceType: 160,
    provider: 180,
    funding: 120,
    discount: 70,
    details: 60
  };
  resizing: { column: string; startX: number; startWidth: number } | null = null;

  private subscriptions: Subscription[] = [];
  private resizeMoveListener: ((e: MouseEvent) => void) | null = null;
  private resizeEndListener: ((e: MouseEvent) => void) | null = null;
  private saveTimeout: any = null;
  private currentUserEmail: string | null = null;
  private readonly TABLE_NAME = 'erate-frn-status';

  constructor(
    private frnService: FRNStatusService,
    private authService: AuthService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadColumnWidths();

    this.subscriptions.push(
      this.frnService.records$.subscribe(records => {
        this.records = records;
        this.extractFilterValues();
        this.applyFilters();
        this.updateNewRecordsCount();
      }),
      this.frnService.loading$.subscribe(loading => this.loading = loading),
      this.frnService.downloading$.subscribe(downloading => this.downloading = downloading),
      this.frnService.error$.subscribe(error => this.error = error),
      this.frnService.lastRefresh$.subscribe(refresh => this.lastRefresh = refresh),
      this.frnService.progress$.subscribe(progress => this.downloadProgress = progress)
    );

    // Load initial data
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

  downloadUpdates(): void {
    this.frnService.downloadUpdates().subscribe();
  }

  getProgressPercentage(): number {
    if (!this.downloadProgress) return 0;
    const { phase, current, total } = this.downloadProgress;
    if (phase === 'fetching') {
      // During fetch phase, use an animated progress that shows activity
      // We don't know the total during fetch, so estimate based on expected ~65k records
      if (total > 0 && current > 0) {
        return Math.min(Math.round((current / total) * 40), 40);
      }
      const estimated = 65000;
      return Math.min(Math.round((current / estimated) * 40), 40);
    }
    if (phase === 'processing') {
      if (total === 0) return 40;
      // Processing is 40-100%
      return Math.min(40 + Math.round((current / total) * 60), 100);
    }
    if (phase === 'complete') return 100;
    return 0;
  }

  applyFilters(): void {
    let filtered = [...this.records];

    // Search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.OrganizationName?.toLowerCase().includes(term) ||
        r.FundingRequestNumber?.toLowerCase().includes(term) ||
        r.ApplicationNumber?.toLowerCase().includes(term) ||
        r.SpinName?.toLowerCase().includes(term) ||
        r.Form471ServiceTypeName?.toLowerCase().includes(term) ||
        r.Nickname?.toLowerCase().includes(term)
      );
    }

    // Funding Year filter
    if (this.fundingYearFilter) {
      filtered = filtered.filter(r => r.FundingYear === this.fundingYearFilter);
    }

    // State filter
    if (this.stateFilter) {
      filtered = filtered.filter(r => r.State === this.stateFilter);
    }

    // FRN Status filter
    if (this.frnStatusFilter) {
      filtered = filtered.filter(r => r.Form471FrnStatusName === this.frnStatusFilter);
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
      const col = this.sortColumn;
      let aVal = (a as any)[col] || '';
      let bVal = (b as any)[col] || '';

      // Numeric sorting for financial columns
      if (col === 'FundingCommitmentRequest' || col === 'DisPct' || col === 'TotalPreDiscountCosts') {
        const aNum = parseFloat(aVal) || 0;
        const bNum = parseFloat(bVal) || 0;
        return this.sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
      }

      const comparison = String(aVal).localeCompare(String(bVal));
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

  extractFilterValues(): void {
    const fundingYears = new Set<string>();
    const frnStatuses = new Set<string>();
    const serviceTypes = new Set<string>();
    const providers = new Set<string>();

    this.records.forEach(r => {
      if (r.FundingYear) fundingYears.add(r.FundingYear);
      if (r.Form471FrnStatusName) frnStatuses.add(r.Form471FrnStatusName);
      if (r.Form471ServiceTypeName) serviceTypes.add(r.Form471ServiceTypeName);
      if (r.SpinName) providers.add(r.SpinName);
    });

    this.uniqueFundingYears = Array.from(fundingYears).sort((a, b) => b.localeCompare(a));
    this.uniqueFrnStatuses = Array.from(frnStatuses).sort();
    this.uniqueServiceTypes = Array.from(serviceTypes).sort();
    this.uniqueProviders = Array.from(providers).sort();
  }

  toggleDropdown(column: string, event: Event): void {
    event.stopPropagation();
    this.openDropdown = this.openDropdown === column ? null : column;
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
    this.frnService.clearNewHighlights();
    this.newRecordsCount = 0;
  }

  clearError(): void {
    this.error = null;
  }

  updateRecordStatus(record: FRNStatusRecord, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const newStatus = select.value;

    if (!record.Id) {
      console.error('Cannot update status: Record has no ID');
      return;
    }

    record.UserStatus = newStatus || undefined;

    this.frnService.updateUserStatus(record.Id, newStatus).subscribe({
      next: (success) => {
        if (!success) {
          select.value = record.UserStatus || '';
        }
      },
      error: () => {
        select.value = record.UserStatus || '';
      }
    });
  }

  formatCurrency(value: string | undefined): string {
    if (!value) return '-';
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
  }

  viewDetails(record: FRNStatusRecord): void {
    this.selectedRecord = record;
  }

  closeDetails(): void {
    this.selectedRecord = null;
  }

  trackByPrimaryKey(index: number, record: FRNStatusRecord): string {
    return record.PrimaryKey;
  }

  // ---- Column resize methods ----

  onResizeStart(event: MouseEvent, column: string): void {
    event.preventDefault();
    event.stopPropagation();

    const currentWidth = this.columnWidths[column] || 100;
    this.resizing = { column, startX: event.clientX, startWidth: currentWidth };

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

    this.saveColumnWidthsDebounced();
  }

  getColumnWidth(column: string): string {
    const width = this.columnWidths[column];
    return width ? `${width}px` : 'auto';
  }

  // ---- Column width persistence ----

  private loadColumnWidths(): void {
    this.subscriptions.push(
      this.authService.currentUser$.subscribe(currentUser => {
        if (!currentUser?.email) return;
        this.currentUserEmail = currentUser.email;
        const apiUrl = environment.apiUrl || 'http://localhost:3000/api';
        this.http.get<{ success: boolean; data: any }>(
          `${apiUrl}/user-preferences/table/${this.TABLE_NAME}?userEmail=${encodeURIComponent(currentUser.email)}`
        ).subscribe({
          next: (response) => {
            if (response?.data?.columnWidths) {
              this.columnWidths = { ...this.columnWidths, ...response.data.columnWidths };
            }
          },
          error: (err) => {
            console.warn('[FRN Status] Could not load column width preferences:', err.message);
          }
        });
      })
    );
  }

  private saveColumnWidthsDebounced(): void {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => this.saveColumnWidths(), 500);
  }

  private saveColumnWidths(): void {
    if (!this.currentUserEmail) return;
    const apiUrl = environment.apiUrl || 'http://localhost:3000/api';
    this.http.put(
      `${apiUrl}/user-preferences/table/${this.TABLE_NAME}`,
      { userEmail: this.currentUserEmail, preferences: { columnWidths: this.columnWidths } }
    ).subscribe({
      next: () => {},
      error: (err) => {
        console.warn('[FRN Status] Could not save column width preferences:', err.message);
      }
    });
  }
}
