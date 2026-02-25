import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import * as XLSX from 'xlsx';
import { CiscoRenewalsService, HardwareRenewalItem, CustomerSummary, RenewalStatus } from '../../shared/services/cisco-renewals.service';
import { RenewalStatusAdminService } from '../../shared/services/renewal-status-admin.service';

type SortColumn = keyof HardwareRenewalItem;
type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-hardware-renewals',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hardware-renewals.component.html',
})
export class HardwareRenewalsComponent implements OnInit, OnDestroy {
  // Data
  allItems: HardwareRenewalItem[] = [];
  filteredItems: HardwareRenewalItem[] = [];
  pagedItems: HardwareRenewalItem[] = [];
  customerSummaries: CustomerSummary[] = [];
  loading = false;

  // Filters
  searchTerm = '';
  architectureFilter = '';
  customerFilter = '';
  productFamilyFilter = '';
  ldosFilter = ''; // 'expired', 'within-6m', 'within-1y', 'beyond-1y'
  statusFilter: RenewalStatus | string = '';
  statusOptions: string[] = [];

  // Filter options
  architectures: string[] = [];
  customerNames: string[] = [];
  productFamilies: string[] = [];

  // Sorting
  sortColumn: SortColumn = 'opportunity';
  sortDirection: SortDirection = 'desc';

  // Pagination
  currentPage = 1;
  pageSize = 25;
  totalPages = 1;
  pageSizeOptions = [10, 25, 50, 100];

  // Summary cards
  totalCustomers = 0;
  totalItems = 0;
  totalQuantity = 0;
  totalOpportunity = 0;

  // View toggle
  activeView: 'table' | 'customers' = 'table';

  private subscriptions: Subscription[] = [];

  constructor(
    private renewalsService: CiscoRenewalsService,
    private statusAdminService: RenewalStatusAdminService
  ) {}

  ngOnInit(): void {
    this.statusOptions = this.statusAdminService.getHardwareStatuses();
    this.subscriptions.push(
      this.statusAdminService.settings$.subscribe(() => {
        this.statusOptions = this.statusAdminService.getHardwareStatuses();
      })
    );
    this.subscriptions.push(
      this.renewalsService.loading$.subscribe(loading => this.loading = loading)
    );

    this.subscriptions.push(
      this.renewalsService.renewals$.subscribe(items => {
        if (items.length > 0) {
          this.allItems = items;
          this.architectures = this.renewalsService.getArchitectures(items);
          this.customerNames = this.renewalsService.getCustomerNames(items);
          this.productFamilies = this.renewalsService.getProductFamilies(items);
          this.customerSummaries = this.renewalsService.getCustomerSummaries(items);
          this.totalCustomers = this.customerSummaries.length;
          this.applyFilters();
        }
      })
    );

    this.renewalsService.loadHardwareRenewals();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  // --- Filtering ---
  applyFilters(): void {
    let filtered = [...this.allItems];

    // Text search
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.installSiteEndCustomerName.toLowerCase().includes(term) ||
        item.globalCustomerName.toLowerCase().includes(term) ||
        item.productId.toLowerCase().includes(term) ||
        item.productDescription.toLowerCase().includes(term) ||
        item.productFamily.toLowerCase().includes(term) ||
        item.architecture.toLowerCase().includes(term) ||
        item.subArchitecture.toLowerCase().includes(term)
      );
    }

    // Architecture filter
    if (this.architectureFilter) {
      filtered = filtered.filter(item => item.architecture === this.architectureFilter);
    }

    // Customer filter
    if (this.customerFilter) {
      filtered = filtered.filter(item => item.installSiteEndCustomerName === this.customerFilter);
    }

    // Product family filter
    if (this.productFamilyFilter) {
      filtered = filtered.filter(item => item.productFamily === this.productFamilyFilter);
    }

    // Status filter
    if (this.statusFilter) {
      filtered = filtered.filter(item => item.status === this.statusFilter);
    }

    // LDOS date filter
    if (this.ldosFilter) {
      const now = new Date();
      const sixMonths = new Date(now);
      sixMonths.setMonth(sixMonths.getMonth() + 6);
      const oneYear = new Date(now);
      oneYear.setFullYear(oneYear.getFullYear() + 1);

      filtered = filtered.filter(item => {
        if (!item.ldos) return false;
        const ldosDate = new Date(item.ldos);
        switch (this.ldosFilter) {
          case 'expired': return ldosDate < now;
          case 'within-6m': return ldosDate >= now && ldosDate <= sixMonths;
          case 'within-1y': return ldosDate >= now && ldosDate <= oneYear;
          case 'beyond-1y': return ldosDate > oneYear;
          default: return true;
        }
      });
    }

    // Apply sort
    filtered.sort((a, b) => {
      const aVal = a[this.sortColumn];
      const bVal = b[this.sortColumn];
      let comparison = 0;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal || '').localeCompare(String(bVal || ''));
      }

      return this.sortDirection === 'asc' ? comparison : -comparison;
    });

    this.filteredItems = filtered;

    // Update summary stats from filtered items
    this.totalItems = filtered.length;
    this.totalQuantity = filtered.reduce((sum, item) => sum + item.itemQuantity, 0);
    this.totalOpportunity = filtered.reduce((sum, item) => sum + item.opportunity, 0);

    // Also update customer summaries based on filtered items
    this.customerSummaries = this.renewalsService.getCustomerSummaries(filtered);
    this.totalCustomers = this.customerSummaries.length;

    // Reset to first page
    this.currentPage = 1;
    this.updatePagination();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.architectureFilter = '';
    this.customerFilter = '';
    this.productFamilyFilter = '';
    this.ldosFilter = '';
    this.statusFilter = '';
    this.applyFilters();
  }

  // --- Sorting ---
  sort(column: SortColumn): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = column === 'opportunity' || column === 'itemQuantity' ? 'desc' : 'asc';
    }
    this.applyFilters();
  }

  getSortIcon(column: SortColumn): string {
    if (this.sortColumn !== column) return '↕';
    return this.sortDirection === 'asc' ? '↑' : '↓';
  }

  // --- Pagination ---
  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredItems.length / this.pageSize) || 1;
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
    const start = (this.currentPage - 1) * this.pageSize;
    this.pagedItems = this.filteredItems.slice(start, start + this.pageSize);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.updatePagination();
  }

  getVisiblePages(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  // --- Formatting ---
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US').format(value);
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  getLdosStatusClass(ldos: string): string {
    if (!ldos) return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
    const now = new Date();
    const ldosDate = new Date(ldos);
    const sixMonths = new Date(now);
    sixMonths.setMonth(sixMonths.getMonth() + 6);

    if (ldosDate < now) {
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    } else if (ldosDate <= sixMonths) {
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    } else {
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    }
  }

  getLdosLabel(ldos: string): string {
    if (!ldos) return 'N/A';
    const now = new Date();
    const ldosDate = new Date(ldos);
    if (ldosDate < now) return 'Expired';
    const diff = ldosDate.getTime() - now.getTime();
    const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30));
    if (months < 1) return '< 1 mo';
    if (months < 12) return `${months} mo`;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    return rem > 0 ? `${years}y ${rem}m` : `${years}y`;
  }

  // --- Status ---
  onStatusChange(item: HardwareRenewalItem, event: Event): void {
    const status = (event.target as HTMLSelectElement).value as RenewalStatus;
    this.renewalsService.updateItemStatus(item, status);
  }

  getStatusBadgeClass(status: string): string {
    return this.statusAdminService.getHardwareStatusBadgeClass(status);
  }

  // --- Export ---
  exportToExcel(): void {
    const data = this.filteredItems.map(item => ({
      'Customer': item.installSiteEndCustomerName,
      'Global Customer': item.globalCustomerName,
      'Country': item.installSiteCountry,
      'Architecture': item.architecture,
      'Sub Architecture': item.subArchitecture,
      'Product Family': item.productFamily,
      'Product ID': item.productId,
      'Product Description': item.productDescription,
      'EOL Date': item.eolDate,
      'LDOS': item.ldos,
      'Quantity': item.itemQuantity,
      'Opportunity': item.opportunity,
      'Status': item.status || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Hardware Renewals');

    const timestamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Hardware_Renewals_${timestamp}.xlsx`);
  }

  // Active filters count for badge
  get activeFilterCount(): number {
    let count = 0;
    if (this.searchTerm.trim()) count++;
    if (this.architectureFilter) count++;
    if (this.customerFilter) count++;
    if (this.productFamilyFilter) count++;
    if (this.ldosFilter) count++;
    if (this.statusFilter) count++;
    return count;
  }
}
