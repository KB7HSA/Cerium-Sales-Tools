import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MSPOfferingsService, MSPOffering } from '../../shared/services/msp-offerings.service';
import { Subscription } from 'rxjs';

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
  activeFilter: string = 'all';
  searchTerm: string = '';
  private subscription: Subscription = new Subscription();

  constructor(public offeringsService: MSPOfferingsService) {}

  ngOnInit(): void {
    this.subscription.add(
      this.offeringsService.getOfferings().subscribe(offerings => {
        this.offerings = offerings;
        this.applyFilters();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  applyFilters(): void {
    let filtered = this.offerings;

    // Filter by category
    if (this.activeFilter !== 'all') {
      filtered = filtered.filter(o => o.category === this.activeFilter);
    }

    // Filter by search term
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(o =>
        o.name.toLowerCase().includes(term) ||
        o.description.toLowerCase().includes(term)
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

  toggleOfferingStatus(id: string, event: Event): void {
    event.stopPropagation();
    this.offeringsService.toggleOfferingStatus(id);
  }

  deleteOffering(id: string, event: Event): void {
    event.stopPropagation();
    if (confirm('Are you sure you want to delete this offering?')) {
      this.offeringsService.deleteOffering(id);
    }
  }

  getTotalServices(): number {
    return this.offerings.length;
  }

  getActiveServices(): number {
    return this.offerings.filter(o => o.isActive).length;
  }

  getServicesByCategory(category: string): number {
    return this.offerings.filter(o => o.category === category).length;
  }

  getTotalMonthlyRevenue(offering: MSPOffering): number {
    const level = this.getDefaultLevel(offering);
    if (!level) return 0;
    return level.basePrice + level.options.reduce((sum, opt) => sum + opt.monthlyPrice, 0);
  }

  getCategoryLabel(category: string): string {
    const labels: { [key: string]: string } = {
      backup: 'Backup Solutions',
      support: 'Support Services',
      database: 'Database Management',
      consulting: 'Consulting'
    };
    return labels[category] || category;
  }

  getCategoryColor(category: string): string {
    const colors: { [key: string]: string } = {
      backup: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      support: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      database: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      consulting: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
    };
    return colors[category] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  }

  getPricingUnitLabel(unit: string): string {
    const labels: { [key: string]: string } = {
      'per-user': '/user/mo',
      'per-gb': '/GB/mo',
      'per-device': '/device/mo',
      'one-time': '/one-time'
    };
    return labels[unit] || unit;
  }

  getDefaultLevel(offering: MSPOffering) {
    return offering.serviceLevels[0] || null;
  }
}
