import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SearchFilters, CountryData, AVAILABLE_COUNTRIES } from './analytics-models';

@Component({
  selector: 'app-domain-search-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white border-b border-gray-200 dark:bg-gray-dark dark:border-gray-700">
      <!-- Search Bar Section -->
      <div class="px-6 py-5">
        <div class="flex items-center gap-3">
          <!-- Report Type Selector -->
          <select 
            [(ngModel)]="searchFilters.reportType"
            class="flex-shrink-0 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600">
            <option value="domain-overview">Domain Overview</option>
            <option value="keyword-analytics">Keyword Analytics</option>
            <option value="backlinks">Backlinks</option>
            <option value="advertising">Advertising Research</option>
          </select>

          <!-- Search Input -->
          <div class="flex-1 relative">
            <input 
              type="text"
              [(ngModel)]="searchFilters.domain"
              placeholder="Enter domain or keyword"
              class="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:text-white dark:border-gray-600"
            />
            @if (searchFilters.domain) {
              <button 
                (click)="clearSearch()"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
                </svg>
              </button>
            }
          </div>

          <!-- Search Button -->
          <button 
            (click)="handleSearch()"
            class="flex-shrink-0 px-6 py-2.5 text-sm font-semibold text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2">
            Search
          </button>
        </div>
      </div>

      <!-- Filters Section -->
      <div class="px-6 pb-4 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-700">
        <!-- Country Selectors -->
        <div class="flex items-center gap-2">
          @for (country of topCountries; track country.code) {
            <button
              (click)="toggleCountry(country)"
              [class.ring-2]="isCountrySelected(country.code)"
              [class.ring-brand-500]="isCountrySelected(country.code)"
              class="px-4 py-2 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors dark:border-gray-600 dark:hover:bg-gray-800"
              [class.bg-brand-50]="isCountrySelected(country.code)"
              [class.text-brand-600]="isCountrySelected(country.code)"
              [class.bg-white]="!isCountrySelected(country.code)"
              [class.text-gray-700]="!isCountrySelected(country.code)"
              [class.dark:bg-gray-800]="!isCountrySelected(country.code)"
              [class.dark:text-gray-300]="!isCountrySelected(country.code)">
              <span class="mr-1.5">{{ country.flag }}</span>
              {{ country.code }}
              <span class="ml-1 text-xs text-gray-500 dark:text-gray-400">{{ country.source }}</span>
            </button>
          }
          
          <!-- More Countries Dropdown -->
          <div class="relative">
            <button
              (click)="showMoreCountries.set(!showMoreCountries())"
              class="px-4 py-2 text-xs font-medium text-gray-700 bg-orange-500 border border-orange-600 rounded-lg hover:bg-orange-600 hover:text-white transition-colors dark:border-orange-500 dark:text-white">
              {{ selectedCountries().length > 4 ? selectedCountries().length - 4 + ' more...' : 'Other Countries' }}
              <svg class="inline-block w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"></path>
              </svg>
            </button>

            @if (showMoreCountries()) {
              <div class="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-theme-lg dark:bg-gray-800 dark:border-gray-700 z-10 max-h-80 overflow-y-auto">
                @for (country of moreCountries; track country.code) {
                  <button
                    (click)="toggleCountry(country)"
                    class="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between"
                    [class.bg-brand-50]="isCountrySelected(country.code)"
                    [class.text-brand-600]="isCountrySelected(country.code)">
                    <span>
                      <span class="mr-2">{{ country.flag }}</span>
                      {{ country.name }}
                    </span>
                    @if (isCountrySelected(country.code)) {
                      <svg class="w-4 h-4 text-brand-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                      </svg>
                    }
                  </button>
                }
              </div>
            }
          </div>
        </div>

        <!-- Device Type Toggle -->
        <div class="flex items-center gap-1 p-1 bg-gray-100 rounded-lg dark:bg-gray-800">
          <button
            (click)="searchFilters.deviceType = 'desktop'"
            [class.bg-white]="searchFilters.deviceType === 'desktop'"
            [class.text-brand-600]="searchFilters.deviceType === 'desktop'"
            [class.shadow-sm]="searchFilters.deviceType === 'desktop'"
            class="px-4 py-1.5 text-xs font-medium rounded-md transition-all dark:text-gray-300"
            [class.dark:bg-gray-700]="searchFilters.deviceType === 'desktop'">
            <svg class="w-4 h-4 inline-block mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clip-rule="evenodd"></path>
            </svg>
            Desktop
          </button>
          <button
            (click)="searchFilters.deviceType = 'mobile'"
            [class.bg-white]="searchFilters.deviceType === 'mobile'"
            [class.text-brand-600]="searchFilters.deviceType === 'mobile'"
            [class.shadow-sm]="searchFilters.deviceType === 'mobile'"
            class="px-4 py-1.5 text-xs font-medium rounded-md transition-all dark:text-gray-300"
            [class.dark:bg-gray-700]="searchFilters.deviceType === 'mobile'">
            <svg class="w-4 h-4 inline-block mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M7 2a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2H7zm3 14a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"></path>
            </svg>
            Mobile
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class DomainSearchHeaderComponent {
  @Output() searchEvent = new EventEmitter<SearchFilters>();

  searchFilters: SearchFilters = {
    domain: 'smepals.com',
    reportType: 'domain-overview',
    countries: [AVAILABLE_COUNTRIES[0]], // US by default
    deviceType: 'desktop'
  };

  topCountries = AVAILABLE_COUNTRIES.slice(0, 4);
  moreCountries = AVAILABLE_COUNTRIES.slice(4);
  showMoreCountries = signal(false);
  selectedCountries = signal<CountryData[]>([AVAILABLE_COUNTRIES[0]]);

  toggleCountry(country: CountryData) {
    const selected = this.selectedCountries();
    const index = selected.findIndex(c => c.code === country.code);
    
    if (index > -1) {
      this.selectedCountries.set(selected.filter(c => c.code !== country.code));
    } else {
      this.selectedCountries.set([...selected, country]);
    }
    
    this.searchFilters.countries = this.selectedCountries();
  }

  isCountrySelected(code: string): boolean {
    return this.selectedCountries().some(c => c.code === code);
  }

  clearSearch() {
    this.searchFilters.domain = '';
  }

  handleSearch() {
    this.searchEvent.emit(this.searchFilters);
  }
}
