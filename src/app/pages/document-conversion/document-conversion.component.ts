import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { 
  DocumentConversionService, 
  DocumentConversionType, 
  ConvertedDocument 
} from '../../shared/services/document-conversion.service';

@Component({
  selector: 'app-document-conversion',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './document-conversion.component.html',
  styleUrl: './document-conversion.component.css'
})
export class DocumentConversionComponent implements OnInit, OnDestroy {
  conversionTypes: DocumentConversionType[] = [];
  convertedDocuments: ConvertedDocument[] = [];
  filteredDocuments: ConvertedDocument[] = [];
  
  selectedTypeId: string = '';
  selectedType: DocumentConversionType | null = null;
  selectedFile: File | null = null;
  selectedFileName: string = '';
  
  isLoading: boolean = false;
  isConverting: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  searchTerm: string = '';
  
  // Tab state
  activeTab: 'convert' | 'history' = 'convert';
  
  // Drag state
  isDragOver: boolean = false;
  
  private subscription: Subscription = new Subscription();

  constructor(private conversionService: DocumentConversionService) {}

  ngOnInit(): void {
    this.subscription.add(
      this.conversionService.conversionTypes$.subscribe(types => {
        this.conversionTypes = types.filter(t => t.IsActive);
      })
    );
    
    this.subscription.add(
      this.conversionService.convertedDocuments$.subscribe(docs => {
        this.convertedDocuments = docs;
        this.applyFilters();
      })
    );
    
    this.loadData();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  loadData(): void {
    this.isLoading = true;
    this.conversionService.loadConversionTypes(true).subscribe(() => {
      this.isLoading = false;
    });
    this.conversionService.loadConvertedDocuments().subscribe();
  }

  onTypeChange(): void {
    this.selectedType = this.conversionTypes.find(t => t.Id === this.selectedTypeId) || null;
    // Clear file if the new type doesn't accept the current file's type
    if (this.selectedFile && this.selectedType) {
      const accepted = this.getAcceptedExtensions();
      const ext = this.selectedFile.name.split('.').pop()?.toLowerCase() || '';
      if (!accepted.includes('.' + ext)) {
        this.clearFile();
        this.errorMessage = `File type .${ext} is not accepted for this conversion type. Please upload a ${this.getAcceptedFileLabel()} file.`;
      }
    }
  }

  /**
   * Get the accept attribute value for the file input based on the selected conversion type
   */
  getAcceptedExtensions(): string {
    if (!this.selectedType) return '.docx,.doc,.pdf';
    const fileTypes = this.selectedType.AcceptedFileTypes || 'docx';
    switch (fileTypes) {
      case 'pdf': return '.pdf';
      case 'both': return '.docx,.doc,.pdf';
      case 'docx':
      default: return '.docx,.doc';
    }
  }

  /**
   * Get a human-readable label for accepted file types
   */
  getAcceptedFileLabel(): string {
    if (!this.selectedType) return 'Word or PDF';
    const fileTypes = this.selectedType.AcceptedFileTypes || 'docx';
    switch (fileTypes) {
      case 'pdf': return 'PDF (.pdf)';
      case 'both': return 'Word (.docx, .doc) or PDF (.pdf)';
      case 'docx':
      default: return 'Word (.docx, .doc)';
    }
  }

  /**
   * Check if a file extension is accepted by the current conversion type
   */
  isFileAccepted(fileName: string): boolean {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const accepted = this.getAcceptedExtensions();
    return accepted.includes('.' + ext);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (this.isFileAccepted(file.name)) {
        this.setFile(file);
      } else {
        this.errorMessage = `File type not accepted. Please upload a ${this.getAcceptedFileLabel()} file.`;
        input.value = ''; // Reset the file input
      }
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
    
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      if (this.isFileAccepted(file.name)) {
        this.setFile(file);
      } else {
        this.errorMessage = `File type not accepted. Please upload a ${this.getAcceptedFileLabel()} file.`;
      }
    }
  }

  setFile(file: File): void {
    this.selectedFile = file;
    this.selectedFileName = file.name;
    this.errorMessage = '';
    this.successMessage = '';
  }

  clearFile(): void {
    this.selectedFile = null;
    this.selectedFileName = '';
  }

  convertDocument(): void {
    if (!this.selectedFile || !this.selectedTypeId) {
      this.errorMessage = 'Please select a conversion type and upload a document.';
      return;
    }

    this.isConverting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.conversionService.convertDocument(this.selectedTypeId, this.selectedFile).subscribe({
      next: (result) => {
        this.isConverting = false;
        if (result) {
          this.successMessage = `Document "${result.ConvertedFileName || result.OriginalFileName}" converted successfully!`;
          // Auto-download the converted document
          if (result.Id) {
            this.downloadDocument(result);
          }
          this.clearFile();
        } else {
          this.errorMessage = 'Failed to convert document. Please try again.';
        }
      },
      error: (err) => {
        this.isConverting = false;
        this.errorMessage = err.message || 'An error occurred during conversion.';
      }
    });
  }

  downloadDocument(doc: ConvertedDocument): void {
    if (!doc.Id) return;
    
    this.conversionService.downloadConvertedDocument(doc.Id).subscribe(blob => {
      if (blob) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.ConvertedFileName || doc.OriginalFileName || 'converted-document.docx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    });
  }

  deleteDocument(doc: ConvertedDocument, event: Event): void {
    event.stopPropagation();
    if (doc.Id && confirm(`Delete "${doc.OriginalFileName}"?`)) {
      this.conversionService.deleteConvertedDocument(doc.Id).subscribe();
    }
  }

  applyFilters(): void {
    let filtered = this.convertedDocuments;
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(d =>
        (d.OriginalFileName || '').toLowerCase().includes(term) ||
        (d.ConvertedFileName || '').toLowerCase().includes(term) ||
        (d.ConversionTypeName || '').toLowerCase().includes(term)
      );
    }
    this.filteredDocuments = filtered;
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  formatDate(date: Date | undefined): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  formatFileSize(bytes: number | undefined): string {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }
}
