import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PageBreadcrumbComponent } from '../../shared/components/common/page-breadcrumb/page-breadcrumb.component';
import { SowGeneratorService, SOWDocument } from '../../shared/services/sow-generator.service';

@Component({
  selector: 'app-sow-generator',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    PageBreadcrumbComponent,
  ],
  templateUrl: './sow-generator.component.html',
  styles: ``
})
export class SowGeneratorComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  documents: SOWDocument[] = [];
  filteredDocuments: SOWDocument[] = [];
  activeFilter: 'all' | 'generated' | 'sent' | 'signed' = 'all';
  isLoading = false;

  constructor(private sowService: SowGeneratorService) {}

  ngOnInit(): void {
    this.sowService.documents$
      .pipe(takeUntil(this.destroy$))
      .subscribe(docs => {
        this.documents = docs;
        this.applyFilter();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setFilter(filter: 'all' | 'generated' | 'sent' | 'signed'): void {
    this.activeFilter = filter;
    this.applyFilter();
  }

  private applyFilter(): void {
    if (this.activeFilter === 'all') {
      this.filteredDocuments = this.documents;
    } else {
      this.filteredDocuments = this.documents.filter(d => d.Status === this.activeFilter);
    }
  }

  downloadDocument(doc: SOWDocument): void {
    this.sowService.downloadSOWById(doc.Id);
  }

  updateStatus(doc: SOWDocument, newStatus: string): void {
    this.sowService.updateDocumentStatus(doc.Id, newStatus).subscribe({
      next: () => {
        // Document list will be refreshed automatically
      },
      error: (err) => {
        alert('Failed to update status: ' + (err.message || 'Unknown error'));
      }
    });
  }

  deleteDocument(doc: SOWDocument): void {
    if (confirm(`Are you sure you want to delete the SOW for "${doc.CustomerName}"?`)) {
      this.sowService.deleteDocument(doc.Id).subscribe({
        next: () => {
          // Document list will be refreshed automatically
        },
        error: (err) => {
          alert('Failed to delete document: ' + (err.message || 'Unknown error'));
        }
      });
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'generated':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200';
      case 'sent':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200';
      case 'signed':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200';
      case 'expired':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-200';
      case 'cancelled':
        return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }

  formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  formatCurrency(value: number): string {
    return '$' + value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  getTotalValue(): number {
    return this.filteredDocuments.reduce((sum, d) => sum + d.TotalValue, 0);
  }

  getCountByStatus(status: string): number {
    if (status === 'all') return this.documents.length;
    return this.documents.filter(d => d.Status === status).length;
  }
}
