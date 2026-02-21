import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AssessmentService, AssessmentType, ReferenceArchitecture, GeneratedAssessment } from '../../shared/services/assessment.service';
import { AssessmentAIService } from '../../shared/services/assessment-ai.service';
import { CustomerManagementService, Customer } from '../../shared/services/customer-management.service';
import { AssessmentDocumentService, AssessmentDocumentData } from '../../shared/services/assessment-document.service';

@Component({
  selector: 'app-assessment-generator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './assessment-generator.component.html',
  styleUrl: './assessment-generator.component.css'
})
export class AssessmentGeneratorComponent implements OnInit, OnDestroy {
  // Data
  assessmentTypes: AssessmentType[] = [];
  referenceArchitectures: ReferenceArchitecture[] = [];
  generatedAssessments: GeneratedAssessment[] = [];
  filteredAssessments: GeneratedAssessment[] = [];
  customers: Customer[] = [];
  
  // UI State
  isLoading: boolean = false;
  isGenerating: boolean = false;
  isGeneratingAI: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  activeTab: 'generate' | 'history' = 'generate';
  searchTerm: string = '';
  statusFilter: string = 'all';
  
  // Form
  selectedTypeId: string = '';
  selectedArchitectureId: string = '';
  selectedCustomerId: string = '';
  customerName: string = '';
  customerContact: string = '';
  customerEmail: string = '';
  assessmentTitle: string = '';
  customNotes: string = '';
  
  // AI Generated Content
  aiGeneratedOverview: string = '';
  showAIPreview: boolean = false;
  
  // Selected type for display
  selectedType: AssessmentType | null = null;
  selectedArchitecture: ReferenceArchitecture | null = null;
  
  private subscription: Subscription = new Subscription();

  constructor(
    private assessmentService: AssessmentService,
    private aiService: AssessmentAIService,
    private customerService: CustomerManagementService,
    private documentService: AssessmentDocumentService
  ) {}

  ngOnInit(): void {
    this.subscription.add(
      this.assessmentService.assessmentTypes$.subscribe(types => {
        this.assessmentTypes = types.filter(t => t.IsActive);
      })
    );
    
    this.subscription.add(
      this.assessmentService.referenceArchitectures$.subscribe(archs => {
        this.referenceArchitectures = archs.filter(a => a.IsActive);
      })
    );
    
    this.subscription.add(
      this.assessmentService.generatedAssessments$.subscribe(assessments => {
        this.generatedAssessments = assessments;
        this.applyFilters();
        this.isLoading = false;
      })
    );

    this.subscription.add(
      this.customerService.customers$.subscribe(customers => {
        this.customers = customers.filter(c => c.status === 'active' || c.Status === 'active');
      })
    );
    
    this.loadData();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  loadData(): void {
    this.isLoading = true;
    this.assessmentService.loadReferenceArchitectures(true).subscribe();
    this.assessmentService.loadAssessmentTypes(true).subscribe();
    this.assessmentService.loadGeneratedAssessments().subscribe();
  }

  onTypeChange(): void {
    this.selectedType = this.assessmentTypes.find(t => t.Id === this.selectedTypeId) || null;
    this.updateTitle();
  }

  onArchitectureChange(): void {
    this.selectedArchitecture = this.referenceArchitectures.find(a => a.Id === this.selectedArchitectureId) || null;
    // Reset assessment type when architecture changes
    this.selectedTypeId = '';
    this.selectedType = null;
    this.updateTitle();
  }

  getAvailableAssessmentTypes(): AssessmentType[] {
    if (!this.selectedArchitectureId) {
      return [];
    }
    
    // Filter assessment types that are linked to the selected reference architecture
    return this.assessmentTypes.filter(type => {
      if (!type.ReferenceArchitectures || type.ReferenceArchitectures.length === 0) {
        // If no specific architectures linked, show for all
        return true;
      }
      return type.ReferenceArchitectures.some(ra => ra.Id === this.selectedArchitectureId);
    });
  }

  updateTitle(): void {
    if (this.customerName && this.selectedType) {
      this.assessmentTitle = `${this.customerName} - ${this.selectedType.Name}`;
      if (this.selectedArchitecture) {
        this.assessmentTitle += ` (${this.selectedArchitecture.Name})`;
      }
    }
  }

  onCustomerChange(): void {
    const selectedCustomer = this.customers.find(c => (c.id || c.Id) === this.selectedCustomerId);
    if (selectedCustomer) {
      this.customerName = selectedCustomer.name || selectedCustomer.Name || '';
      this.customerContact = ''; // Reset contact - can be filled manually
      this.customerEmail = selectedCustomer.email || selectedCustomer.Email || '';
    }
    this.updateTitle();
  }

  onCustomerNameChange(): void {
    this.updateTitle();
  }

  // Legacy method - keeping for reference but no longer needed
  // Reference Architecture is now the top-level selection
  getAvailableArchitectures(): ReferenceArchitecture[] {
    return this.referenceArchitectures;
  }

  canGenerate(): boolean {
    return !!(this.selectedTypeId && this.selectedArchitectureId && this.selectedCustomerId && this.customerName && this.assessmentTitle);
  }

  async generateAssessment(): Promise<void> {
    if (!this.canGenerate() || !this.selectedType) {
      return;
    }
    
    this.isGenerating = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      // Process templates with placeholders
      const processedOverview = this.aiGeneratedOverview || this.processTemplate(this.selectedType.OverviewTemplate || '');
      const processedScope = this.processTemplate(this.selectedType.ScopeTemplate || '');
      const processedMethodology = this.processTemplate(this.selectedType.MethodologyTemplate || '');
      const processedDeliverables = this.processTemplate(this.selectedType.DeliverablesTemplate || '');
      const processedRecommendations = this.processTemplate(this.selectedType.RecommendationsTemplate || '');

      const assessment: GeneratedAssessment = {
        AssessmentTypeId: this.selectedTypeId,
        ReferenceArchitectureId: this.selectedArchitectureId,
        CustomerName: this.customerName,
        CustomerContact: this.customerContact || undefined,
        CustomerEmail: this.customerEmail || undefined,
        Title: this.assessmentTitle,
        ExecutiveSummary: processedOverview,
        Scope: processedScope,
        Methodology: processedMethodology,
        Findings: '', // To be filled by AI or user
        Recommendations: processedRecommendations,
        NextSteps: processedDeliverables,
        EstimatedHours: this.selectedType.DefaultHours || 16,
        HourlyRate: this.selectedType.DefaultRate || 175,
        Status: 'draft',
        Notes: this.customNotes || undefined
      };

      // Prepare document data for DOCX generation
      const documentData: AssessmentDocumentData = {
        customerName: this.customerName,
        assessmentTitle: this.assessmentTitle,
        practiceArea: this.selectedArchitecture?.Name || '',
        assessmentType: this.selectedType.Name,
        executiveSummary: processedOverview,
        scope: processedScope,
        methodology: processedMethodology,
        recommendations: processedRecommendations,
        estimatedHours: this.selectedType.DefaultHours || 16,
        hourlyRate: this.selectedType.DefaultRate || 175,
        totalPrice: (this.selectedType.DefaultHours || 16) * (this.selectedType.DefaultRate || 175),
        templateFileName: this.selectedType.TemplateFileName || 'Assessment-Template.docx'
      };

      this.assessmentService.createGeneratedAssessment(assessment).subscribe({
        next: async (created) => {
          if (created && created.Id) {
            // Generate the DOCX document
            try {
              const documentBlob = await this.documentService.generateDocument(documentData);
              
              // Convert blob to base64 for database storage
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64Data = (reader.result as string).split(',')[1]; // Remove data:application/...;base64, prefix
                const fileName = `${this.customerName.replace(/[^a-zA-Z0-9]/g, '_')}_Assessment_${new Date().toISOString().split('T')[0]}.docx`;
                
                // Save document to database
                this.assessmentService.updateAssessmentDocument(created.Id!, fileName, base64Data).subscribe({
                  next: (success) => {
                    if (success) {
                      // Also trigger download for user
                      const url = window.URL.createObjectURL(documentBlob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = fileName;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      window.URL.revokeObjectURL(url);
                      
                      this.successMessage = `Assessment "${this.assessmentTitle}" created and document saved!`;
                    } else {
                      this.successMessage = `Assessment "${this.assessmentTitle}" created! (Document save failed)`;
                    }
                    this.resetForm();
                    this.activeTab = 'history';
                    this.isGenerating = false;
                  },
                  error: (err) => {
                    console.error('Error saving document:', err);
                    this.successMessage = `Assessment "${this.assessmentTitle}" created! (Document save failed)`;
                    this.resetForm();
                    this.activeTab = 'history';
                    this.isGenerating = false;
                  }
                });
              };
              reader.readAsDataURL(documentBlob);
            } catch (docError) {
              console.error('Error generating document:', docError);
              this.successMessage = `Assessment "${this.assessmentTitle}" created! (Document generation failed)`;
              this.resetForm();
              this.activeTab = 'history';
              this.isGenerating = false;
            }
          } else {
            this.errorMessage = 'Failed to create assessment. Please try again.';
            this.isGenerating = false;
          }
        },
        error: (error) => {
          console.error('Error creating assessment:', error);
          this.errorMessage = 'An error occurred while creating the assessment.';
          this.isGenerating = false;
        }
      });
    } catch (error) {
      console.error('Error generating assessment:', error);
      this.errorMessage = 'An error occurred while generating the assessment.';
      this.isGenerating = false;
    }
  }

  processTemplate(template: string): string {
    if (!template) return '';
    
    return template
      .replace(/\{customerName\}/gi, this.customerName)
      .replace(/\{referenceArchitecture\}/gi, this.selectedArchitecture?.Name || '');
  }

  resetForm(): void {
    this.selectedTypeId = '';
    this.selectedArchitectureId = '';
    this.customerName = '';
    this.customerContact = '';
    this.customerEmail = '';
    this.assessmentTitle = '';
    this.customNotes = '';
    this.selectedType = null;
    this.selectedArchitecture = null;
    this.aiGeneratedOverview = '';
    this.showAIPreview = false;
  }

  // AI Content Generation
  generateAIContent(): void {
    if (!this.selectedType || !this.selectedArchitecture || !this.customerName) {
      this.errorMessage = 'Please select an assessment type, reference architecture, and enter customer name first.';
      return;
    }

    this.isGeneratingAI = true;
    this.errorMessage = '';

    this.aiService.generateExecutiveSummary(
      this.customerName,
      this.selectedType.Name,
      this.selectedArchitecture.Name,
      this.selectedType.AIPromptOverview
    ).subscribe({
      next: (content) => {
        this.aiGeneratedOverview = content;
        this.showAIPreview = true;
        this.isGeneratingAI = false;
        this.successMessage = 'AI content generated successfully!';
      },
      error: (error) => {
        console.error('Error generating AI content:', error);
        this.errorMessage = 'Failed to generate AI content. Please try again.';
        this.isGeneratingAI = false;
      }
    });
  }

  useAIContent(): void {
    // The AI content will be used when generating the assessment
    this.showAIPreview = false;
    this.successMessage = 'AI content will be included in the generated assessment.';
  }

  // History Tab Methods
  applyFilters(): void {
    let filtered = this.generatedAssessments;

    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(a => a.Status === this.statusFilter);
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(a =>
        (a.Title || '').toLowerCase().includes(term) ||
        (a.CustomerName || '').toLowerCase().includes(term) ||
        (a.AssessmentTypeName || '').toLowerCase().includes(term)
      );
    }

    this.filteredAssessments = filtered;
  }

  setStatusFilter(status: string): void {
    this.statusFilter = status;
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  downloadAssessment(assessment: GeneratedAssessment): void {
    if (assessment.Id) {
      this.assessmentService.downloadAssessment(assessment.Id);
    }
  }

  deleteAssessment(assessment: GeneratedAssessment): void {
    if (assessment.Id && confirm(`Are you sure you want to delete "${assessment.Title}"?`)) {
      this.assessmentService.deleteGeneratedAssessment(assessment.Id).subscribe(success => {
        if (success) {
          this.successMessage = 'Assessment deleted successfully.';
        } else {
          this.errorMessage = 'Failed to delete assessment.';
        }
      });
    }
  }

  updateStatus(assessment: GeneratedAssessment, status: string): void {
    if (assessment.Id) {
      this.assessmentService.updateAssessmentStatus(assessment.Id, status).subscribe(success => {
        if (!success) {
          this.errorMessage = 'Failed to update assessment status.';
        }
      });
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      case 'generated': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'sent': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'archived': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatCurrency(value: number | undefined): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
  }
}
