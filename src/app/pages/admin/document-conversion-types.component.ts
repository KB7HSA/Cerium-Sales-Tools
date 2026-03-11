import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { DocumentConversionService, DocumentConversionType, ConvertApiStatus } from '../../shared/services/document-conversion.service';

@Component({
  selector: 'app-document-conversion-types',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './document-conversion-types.component.html',
  styleUrl: './document-conversion-types.component.css'
})
export class DocumentConversionTypesComponent implements OnInit, OnDestroy {
  conversionTypes: DocumentConversionType[] = [];
  filteredTypes: DocumentConversionType[] = [];
  searchTerm: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';
  private subscription: Subscription = new Subscription();
  
  // Modal state
  showModal: boolean = false;
  editingType: DocumentConversionType | null = null;
  formData: DocumentConversionType = this.getEmptyType();

  // ConvertAPI status
  convertApiStatus: ConvertApiStatus | null = null;
  convertApiStatusLoading: boolean = false;

  // Header/Footer extraction details
  hfDetails: Array<{ kind: string; type: string; partFile: string; innerXml: string }> = [];
  hfExtractMessage: string = '';

  constructor(private conversionService: DocumentConversionService) {}

  ngOnInit(): void {
    this.subscription.add(
      this.conversionService.conversionTypes$.subscribe(types => {
        this.conversionTypes = types;
        this.applyFilters();
        this.isLoading = false;
      })
    );
    
    this.loadData();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  loadData(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.conversionService.loadConversionTypes().subscribe();
  }

  getEmptyType(): DocumentConversionType {
    return {
      Name: '',
      Description: '',
      Category: '',
      TemplateFileName: '',
      HeaderContent: '',
      FooterContent: '',
      OutputFileNamePattern: '{originalName}_converted',
      AcceptedFileTypes: 'docx',
      ConversionMethod: 'template-apply',
      UseAdobeApi: false,
      HeaderXml: '',
      FooterXml: '',
      IsActive: true,
      SortOrder: 0
    };
  }

  applyFilters(): void {
    let filtered = this.conversionTypes;

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        (t.Name || '').toLowerCase().includes(term) ||
        (t.Description || '').toLowerCase().includes(term) ||
        (t.Category || '').toLowerCase().includes(term)
      );
    }

    this.filteredTypes = filtered;
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  openCreateModal(): void {
    this.editingType = null;
    this.formData = this.getEmptyType();
    this.convertApiStatus = null;
    this.showModal = true;
  }

  openEditModal(type: DocumentConversionType): void {
    this.editingType = type;
    this.formData = { ...type };
    this.convertApiStatus = null;
    if (this.formData.UseAdobeApi) {
      this.checkConvertApiStatus();
    }
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingType = null;
    this.formData = this.getEmptyType();
  }

  saveType(): void {
    if (this.editingType?.Id) {
      this.conversionService.updateConversionType(this.editingType.Id, this.formData).subscribe(result => {
        if (result) {
          this.closeModal();
        } else {
          this.errorMessage = 'Failed to update conversion type';
        }
      });
    } else {
      this.conversionService.createConversionType(this.formData).subscribe(result => {
        if (result) {
          this.closeModal();
        } else {
          this.errorMessage = 'Failed to create conversion type';
        }
      });
    }
  }

  toggleStatus(type: DocumentConversionType, event: Event): void {
    event.stopPropagation();
    if (type.Id) {
      this.conversionService.toggleConversionTypeStatus(type.Id);
    }
  }

  deleteType(type: DocumentConversionType, event: Event): void {
    event.stopPropagation();
    if (type.Id && confirm(`Are you sure you want to delete "${type.Name}"?`)) {
      this.conversionService.deleteConversionType(type.Id).subscribe(success => {
        if (!success) {
          this.errorMessage = 'Failed to delete conversion type';
        }
      });
    }
  }

  onUseAdobeApiChange(): void {
    if (this.formData.UseAdobeApi) {
      this.checkConvertApiStatus();
    } else {
      this.convertApiStatus = null;
    }
  }

  checkConvertApiStatus(): void {
    this.convertApiStatusLoading = true;
    this.conversionService.checkConvertApiStatus().subscribe(status => {
      this.convertApiStatus = status;
      this.convertApiStatusLoading = false;
    });
  }

  extractHeaderFooterFromTemplate(): void {
    if (!this.formData.TemplateFileName) return;
    this.hfDetails = [];
    this.hfExtractMessage = 'Extracting...';
    this.conversionService.extractHeaderFooterFromTemplate(this.formData.TemplateFileName).subscribe(result => {
      if (result) {
        if (result.headerXml && !this.formData.HeaderXml) {
          this.formData.HeaderXml = result.headerXml;
        }
        if (result.footerXml && !this.formData.FooterXml) {
          this.formData.FooterXml = result.footerXml;
        }
        this.hfDetails = result.details || [];
        const types = this.hfDetails.map(d => `${d.kind}(${d.type})`).join(', ');
        this.hfExtractMessage = `Found ${this.hfDetails.length} part(s): ${types}. All will be copied from template during conversion.`;
      } else {
        this.hfExtractMessage = 'No header/footer found in template.';
      }
    });
  }
}
