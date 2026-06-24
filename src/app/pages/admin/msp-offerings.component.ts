import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { MSPOfferingsService, MSPOffering, PricingUnit } from '../../shared/services/msp-offerings.service';
import { MSPCategoriesService, MSPCategory } from '../../shared/services/msp-categories.service';
import { PricingUnitOption, PricingUnitsService } from '../../shared/services/pricing-units.service';

@Component({
  selector: 'app-msp-offerings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './msp-offerings.component.html',
  styleUrl: './msp-offerings.component.css'
})
export class MSPOfferingsComponent implements OnInit, OnDestroy {
  offerings: MSPOffering[] = [];
  filteredOfferings: MSPOffering[] = [];
  activeFilter = 'all';
  searchTerm = '';
  pricingUnits: PricingUnitOption[] = [];
  categories: MSPCategory[] = [];
  isLoading = false;
  errorMessage = '';
  private subscription: Subscription = new Subscription();

  constructor(
    public offeringsService: MSPOfferingsService,
    private categoriesService: MSPCategoriesService,
    private pricingUnitsService: PricingUnitsService
  ) {}

  ngOnInit(): void {
    this.pricingUnits = this.pricingUnitsService.getUnits();

    this.subscription.add(
      this.offeringsService.getOfferings().subscribe(offerings => {
        this.offerings = offerings;
        this.applyFilters();
        this.isLoading = false;
      })
    );

    this.subscription.add(
      this.categoriesService.getCategories(true).subscribe({
        next: categories => {
          this.categories = categories;
          this.applyFilters();
        },
        error: () => {
          this.categories = [];
        }
      })
    );

    this.refreshOfferings();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  refreshOfferings(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.offeringsService.refreshOfferings();
  }

  applyFilters(): void {
    let filtered = this.offerings;

    if (this.activeFilter !== 'all') {
      filtered = filtered.filter(o => (o.category || o.Category) === this.activeFilter);
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(o =>
        (o.name || o.Name || '').toLowerCase().includes(term) ||
        (o.description || o.Description || '').toLowerCase().includes(term)
      );
    }

    this.filteredOfferings = filtered;
  }

  setFilter(filter: string): void {
    this.activeFilter = filter;
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  toggleOfferingStatus(id: string | undefined, event: Event): void {
    if (!id) {
      return;
    }
    event.stopPropagation();
    this.offeringsService.toggleOfferingStatus(id);
  }

  deleteOffering(id: string | undefined, event: Event): void {
    if (!id) {
      return;
    }
    event.stopPropagation();
    if (confirm('Are you sure you want to delete this offering?')) {
      this.offeringsService.deleteOffering(id);
    }
  }

  getOfferingId(offering: MSPOffering): string {
    return (offering.id || offering.Id) || '';
  }

  getTotalServices(): number {
    return this.offerings.length;
  }

  getActiveServices(): number {
    return this.offerings.filter(o => o.isActive).length;
  }

  getServicesByCategory(category: string): number {
    return this.offerings.filter(o => (o.category || o.Category) === category).length;
  }

  getCategoryLabel(category: string | undefined): string {
    if (!category) {
      return 'Unknown';
    }
    const match = this.categories.find(c => c.slug === category);
    return match?.name || category;
  }

  getCategoryColor(category: string | undefined): string {
    const colors: { [key: string]: string } = {
      backup: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      support: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      database: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      consulting: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
    };
    return colors[category as string] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  }

  getFilterCategories(): MSPCategory[] {
    return this.categories;
  }

  getPricingUnitLabel(unit: PricingUnit): string {
    const match = this.pricingUnits.find(option => option.value === unit);
    return match?.suffix || unit;
  }

  getDefaultLevel(offering: MSPOffering) {
    return offering.serviceLevels[0] || null;
  }
}
