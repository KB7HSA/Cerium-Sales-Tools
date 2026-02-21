import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { AssessmentService, AssessmentType, ReferenceArchitecture } from '../../shared/services/assessment.service';

@Component({
  selector: 'app-assessment-types',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './assessment-types.component.html',
  styleUrl: './assessment-types.component.css'
})
export class AssessmentTypesComponent implements OnInit, OnDestroy {
  assessmentTypes: AssessmentType[] = [];
  filteredTypes: AssessmentType[] = [];
  referenceArchitectures: ReferenceArchitecture[] = [];
  searchTerm: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';
  private subscription: Subscription = new Subscription();
  
  // Modal state
  showModal: boolean = false;
  editingType: AssessmentType | null = null;
  formData: AssessmentType = this.getEmptyType();

  constructor(private assessmentService: AssessmentService) {}

  ngOnInit(): void {
    this.subscription.add(
      this.assessmentService.assessmentTypes$.subscribe(types => {
        this.assessmentTypes = types;
        this.applyFilters();
        this.isLoading = false;
      })
    );
    
    this.subscription.add(
      this.assessmentService.referenceArchitectures$.subscribe(archs => {
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
    this.assessmentService.loadReferenceArchitectures().subscribe();
    this.assessmentService.loadAssessmentTypes().subscribe();
  }

  getEmptyType(): AssessmentType {
    return {
      Name: '',
      Description: '',
      TemplateFileName: 'Assessment-Template.docx',
      OverviewTemplate: '',
      ScopeTemplate: '',
      MethodologyTemplate: '',
      DeliverablesTemplate: '',
      RecommendationsTemplate: '',
      AIPromptOverview: '',
      AIPromptFindings: '',
      AIPromptRecommendations: '',
      DefaultHours: 16,
      DefaultRate: 175,
      IsActive: true,
      SortOrder: 0,
      selectedArchitectureIds: []
    };
  }

  applyFilters(): void {
    let filtered = this.assessmentTypes;

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        (t.Name || '').toLowerCase().includes(term) ||
        (t.Description || '').toLowerCase().includes(term)
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
    this.showModal = true;
  }

  openEditModal(type: AssessmentType): void {
    this.editingType = type;
    this.formData = { 
      ...type,
      selectedArchitectureIds: type.ReferenceArchitectures?.map(ra => ra.Id!) || []
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingType = null;
    this.formData = this.getEmptyType();
  }

  saveType(): void {
    if (this.editingType?.Id) {
      this.assessmentService.updateAssessmentType(this.editingType.Id, this.formData).subscribe(result => {
        if (result) {
          this.closeModal();
        } else {
          this.errorMessage = 'Failed to update assessment type';
        }
      });
    } else {
      this.assessmentService.createAssessmentType(this.formData).subscribe(result => {
        if (result) {
          this.closeModal();
        } else {
          this.errorMessage = 'Failed to create assessment type';
        }
      });
    }
  }

  toggleStatus(type: AssessmentType, event: Event): void {
    event.stopPropagation();
    if (type.Id) {
      this.assessmentService.toggleAssessmentTypeStatus(type.Id);
    }
  }

  deleteType(type: AssessmentType, event: Event): void {
    event.stopPropagation();
    if (type.Id && confirm(`Are you sure you want to delete "${type.Name}"?`)) {
      this.assessmentService.deleteAssessmentType(type.Id).subscribe(success => {
        if (!success) {
          this.errorMessage = 'Failed to delete assessment type';
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

  formatCurrency(value: number | undefined): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
  }
}
