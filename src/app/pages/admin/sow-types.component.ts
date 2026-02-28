import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { SOWService, SOWType, ReferenceArchitecture, SOWContentSection } from '../../shared/services/sow.service';

@Component({
  selector: 'app-sow-types',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './sow-types.component.html',
  styleUrl: './sow-types.component.css'
})
export class SOWTypesComponent implements OnInit, OnDestroy {
  sowTypes: SOWType[] = [];
  filteredTypes: SOWType[] = [];
  referenceArchitectures: ReferenceArchitecture[] = [];
  searchTerm: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';
  private subscription: Subscription = new Subscription();
  
  // Modal state
  showModal: boolean = false;
  editingType: SOWType | null = null;
  formData: SOWType = this.getEmptyType();
  contentSections: SOWContentSection[] = [];

  constructor(private sowService: SOWService) {}

  ngOnInit(): void {
    this.subscription.add(
      this.sowService.sowTypes$.subscribe(types => {
        this.sowTypes = types;
        this.applyFilters();
        this.isLoading = false;
      })
    );
    
    this.subscription.add(
      this.sowService.referenceArchitectures$.subscribe(archs => {
        this.referenceArchitectures = archs;
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
    this.sowService.loadReferenceArchitectures().subscribe();
    this.sowService.loadSOWTypes().subscribe();
  }

  getEmptyType(): SOWType {
    return {
      Name: '',
      Description: '',
      Category: '',
      TemplateFileName: 'SOW-Template.docx',
      OverviewTemplate: '',
      ScopeTemplate: '',
      MethodologyTemplate: '',
      DeliverablesTemplate: '',
      RecommendationsTemplate: '',
      AIPromptOverview: '',
      AIPromptFindings: '',
      AIPromptRecommendations: '',
      AIPromptScope: '',
      AITemperature: 0.7,
      ResourceFolder: '',
      DefaultHours: 40,
      DefaultRate: 175,
      IsActive: true,
      SortOrder: 0,
      selectedArchitectureIds: []
    };
  }

  applyFilters(): void {
    let filtered = this.sowTypes;

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
    this.contentSections = [];
    this.showModal = true;
  }

  openEditModal(type: SOWType): void {
    this.editingType = type;
    this.formData = { 
      ...type,
      selectedArchitectureIds: type.ReferenceArchitectures?.map(ra => ra.Id!) || []
    };
    this.contentSections = this.parseContentSections(type.ContentSections);
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingType = null;
    this.formData = this.getEmptyType();
    this.contentSections = [];
  }

  saveType(): void {
    // Serialize content sections to JSON before saving
    this.formData.ContentSections = this.contentSections.length > 0
      ? JSON.stringify(this.contentSections)
      : null as any;

    if (this.editingType?.Id) {
      this.sowService.updateSOWType(this.editingType.Id, this.formData).subscribe(result => {
        if (result) {
          this.closeModal();
        } else {
          this.errorMessage = 'Failed to update SOW type';
        }
      });
    } else {
      this.sowService.createSOWType(this.formData).subscribe(result => {
        if (result) {
          this.closeModal();
        } else {
          this.errorMessage = 'Failed to create SOW type';
        }
      });
    }
  }

  toggleStatus(type: SOWType, event: Event): void {
    event.stopPropagation();
    if (type.Id) {
      this.sowService.toggleSOWTypeStatus(type.Id);
    }
  }

  deleteType(type: SOWType, event: Event): void {
    event.stopPropagation();
    if (type.Id && confirm(`Are you sure you want to delete "${type.Name}"?`)) {
      this.sowService.deleteSOWType(type.Id).subscribe(success => {
        if (!success) {
          this.errorMessage = 'Failed to delete SOW type';
        }
      });
    }
  }

  isArchitectureSelected(archId: string | undefined): boolean {
    if (!archId) return false;
    return this.formData.selectedArchitectureIds?.includes(archId) || false;
  }

  toggleArchitecture(archId: string | undefined): void {
    if (!archId) return;
    if (!this.formData.selectedArchitectureIds) {
      this.formData.selectedArchitectureIds = [];
    }
    
    const index = this.formData.selectedArchitectureIds.indexOf(archId);
    if (index > -1) {
      this.formData.selectedArchitectureIds.splice(index, 1);
    } else {
      this.formData.selectedArchitectureIds.push(archId);
    }
  }

  // Content Sections management
  parseContentSections(json?: string): SOWContentSection[] {
    if (!json) return [];
    try {
      return JSON.parse(json);
    } catch {
      return [];
    }
  }

  addContentSection(): void {
    this.contentSections.push({
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2),
      name: '',
      type: 'text',
      content: '',
      templateTag: '',
      sortOrder: this.contentSections.length,
      enabledByDefault: true
    });
  }

  removeContentSection(index: number): void {
    this.contentSections.splice(index, 1);
    this.contentSections.forEach((s, i) => s.sortOrder = i);
  }

  moveContentSection(index: number, direction: 'up' | 'down'): void {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= this.contentSections.length) return;
    const temp = this.contentSections[index];
    this.contentSections[index] = this.contentSections[newIndex];
    this.contentSections[newIndex] = temp;
    this.contentSections.forEach((s, i) => s.sortOrder = i);
  }

  formatCurrency(value: number | undefined): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
  }
}
