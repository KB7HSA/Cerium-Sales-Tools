import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, forkJoin, of } from 'rxjs';
import { AssessmentService, AssessmentType, ReferenceArchitecture, GeneratedAssessment } from '../../shared/services/assessment.service';
import { AssessmentAIService, AIGenerationContext, AIDocumentReviewResponse } from '../../shared/services/assessment-ai.service';
import { CustomerManagementService, Customer } from '../../shared/services/customer-management.service';
import { AssessmentDocumentService, AssessmentDocumentData } from '../../shared/services/assessment-document.service';
import { AuthService } from '../../shared/services/auth.service';

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
  aiGeneratedFindings: string = '';
  aiGeneratedRecommendations: string = '';
  aiGeneratedScope: string = '';
  showAIPreview: boolean = false;
  aiConfigured: boolean = false;
  aiModel: string = '';
  
  // AI prompt enable/disable checkboxes
  enableAIOverview: boolean = true;
  enableAIFindings: boolean = true;
  enableAIRecommendations: boolean = true;
  enableAIScope: boolean = false;
  enableTechnicalResources: boolean = false;
  
  // Technical Resources
  technicalResourcesContent: string = '';
  technicalResourcesFiles: string[] = [];
  isLoadingResources: boolean = false;
  resourcesLoaded: boolean = false;
  
  // Debug prompt preview
  showDebugPrompt: boolean = false;
  debugSystemPrompt: string = '';
  debugUserPrompt: string = '';
  debugModel: string = '';
  debugConfigured: boolean = false;
  
  // Professional Review
  enableProfessionalReview: boolean = false;
  isReviewing: boolean = false;
  showReviewResults: boolean = false;
  reviewRating: number = 0;
  reviewSuggestions: string[] = [];
  reviewSummary: string = '';
  
  // Selected type for display
  selectedType: AssessmentType | null = null;
  selectedArchitecture: ReferenceArchitecture | null = null;
  
  private subscription: Subscription = new Subscription();

  constructor(
    private assessmentService: AssessmentService,
    private aiService: AssessmentAIService,
    private customerService: CustomerManagementService,
    private documentService: AssessmentDocumentService,
    private authService: AuthService
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
    
    // Check Azure OpenAI status
    this.aiService.checkAIStatus().subscribe(status => {
      this.aiConfigured = status.configured;
    });
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
    // Auto-enable checkboxes based on whether the AI prompt field has content
    if (this.selectedType) {
      this.enableAIOverview = !!(this.selectedType.AIPromptOverview && this.selectedType.AIPromptOverview.trim());
      this.enableAIFindings = !!(this.selectedType.AIPromptFindings && this.selectedType.AIPromptFindings.trim());
      this.enableAIRecommendations = !!(this.selectedType.AIPromptRecommendations && this.selectedType.AIPromptRecommendations.trim());
      this.enableAIScope = !!(this.selectedType.AIPromptScope && this.selectedType.AIPromptScope.trim());
      // Auto-enable technical resources if a resource folder is configured
      this.enableTechnicalResources = !!(this.selectedType.ResourceFolder && this.selectedType.ResourceFolder.trim());
      // Reset loaded resources when type changes
      this.technicalResourcesContent = '';
      this.technicalResourcesFiles = [];
      this.resourcesLoaded = false;
    }
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
      this.customerName = selectedCustomer.company || selectedCustomer.Company || selectedCustomer.name || selectedCustomer.Name || '';
      this.customerContact = selectedCustomer.name || selectedCustomer.Name || '';
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
      const processedScope = this.aiGeneratedScope || this.processTemplate(this.selectedType.ScopeTemplate || '');
      const processedMethodology = this.processTemplate(this.selectedType.MethodologyTemplate || '');
      const processedDeliverables = this.processTemplate(this.selectedType.DeliverablesTemplate || '');
      const processedRecommendations = this.aiGeneratedRecommendations || this.processTemplate(this.selectedType.RecommendationsTemplate || '');

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
        Findings: this.aiGeneratedFindings || '', // AI-generated or empty
        Recommendations: processedRecommendations,
        NextSteps: processedDeliverables,
        EstimatedHours: this.selectedType.DefaultHours || 16,
        HourlyRate: this.selectedType.DefaultRate || 175,
        Status: 'draft',
        GeneratedBy: this.authService.getCurrentUser()?.name || this.authService.getCurrentUser()?.email || undefined,
        Notes: this.customNotes || undefined
      };

      // Prepare document data for DOCX generation
      const documentData: AssessmentDocumentData = {
        customerName: this.customerName,
        customerContact: this.customerContact || this.customerName,
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
        templateFileName: this.selectedType.TemplateFileName || 'Assessment-Template.docx',
        aiSummary: this.aiGeneratedOverview || '',
        aiFindings: this.aiGeneratedFindings || '',
        aiRecommendations: this.aiGeneratedRecommendations || '',
        aiScope: this.aiGeneratedScope || ''
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

                    // If professional review is enabled, run it before resetting
                    if (this.enableProfessionalReview) {
                      this.performProfessionalReview(documentData);
                    } else {
                      this.resetForm();
                      this.activeTab = 'history';
                    }
                    this.isGenerating = false;
                  },
                  error: (err) => {
                    console.error('Error saving document:', err);
                    this.successMessage = `Assessment "${this.assessmentTitle}" created! (Document save failed)`;
                    if (this.enableProfessionalReview) {
                      this.performProfessionalReview(documentData);
                    } else {
                      this.resetForm();
                      this.activeTab = 'history';
                    }
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
      .replace(/\{companyName\}/gi, this.customerName)
      .replace(/\{customerName\}/gi, this.customerName)
      .replace(/\{referenceArchitecture\}/gi, this.selectedArchitecture?.Name || '')
      .replace(/\{AI_Summary\}/gi, this.aiGeneratedOverview || '')
      .replace(/\{AI_Findings\}/gi, this.aiGeneratedFindings || '')
      .replace(/\{AI_Recommendations\}/gi, this.aiGeneratedRecommendations || '')
      .replace(/\{AI_Scope\}/gi, this.aiGeneratedScope || '');
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
    this.aiGeneratedFindings = '';
    this.aiGeneratedRecommendations = '';
    this.aiGeneratedScope = '';
    this.showAIPreview = false;
    this.technicalResourcesContent = '';
    this.technicalResourcesFiles = [];
    this.resourcesLoaded = false;
    this.enableTechnicalResources = false;
  }

  // AI Content Generation
  generateAIContent(): void {
    if (!this.selectedType || !this.selectedArchitecture || !this.customerName) {
      this.errorMessage = 'Please select an assessment type, reference architecture, and enter customer name first.';
      return;
    }

    if (!this.enableAIOverview && !this.enableAIFindings && !this.enableAIRecommendations && !this.enableAIScope) {
      this.errorMessage = 'Please enable at least one AI content section to generate.';
      return;
    }

    // If technical resources are enabled and not yet loaded, load them first
    if (this.enableTechnicalResources && this.selectedType.ResourceFolder && !this.resourcesLoaded) {
      this.isLoadingResources = true;
      this.isGeneratingAI = true;
      this.errorMessage = '';
      
      this.aiService.getTechnicalResources(this.selectedType.ResourceFolder).subscribe({
        next: (result) => {
          this.technicalResourcesContent = result.content;
          this.technicalResourcesFiles = result.files;
          this.resourcesLoaded = true;
          this.isLoadingResources = false;
          // Now proceed with AI generation
          this.doGenerateAIContent();
        },
        error: (error) => {
          console.error('Error loading technical resources:', error);
          this.isLoadingResources = false;
          // Proceed without resources
          this.doGenerateAIContent();
        }
      });
    } else {
      this.isGeneratingAI = true;
      this.errorMessage = '';
      this.doGenerateAIContent();
    }
  }

  private doGenerateAIContent(): void {
    const contactName = this.customerContact || this.customerName;
    const companyName = this.customerName;

    // Build rich context object with all available information
    const baseContext: AIGenerationContext = {
      prompt: '',
      customerName: contactName,
      companyName: companyName,
      customerEmail: this.customerEmail || '',
      assessmentType: this.selectedType!.Name,
      assessmentTypeDescription: this.selectedType!.Description || '',
      assessmentTypeCategory: this.selectedType!.Category || '',
      referenceArchitecture: this.selectedArchitecture!.Name,
      scopeContext: this.selectedType!.ScopeTemplate || '',
      methodologyContext: this.selectedType!.MethodologyTemplate || '',
      additionalNotes: this.customNotes || '',
      technicalResources: (this.enableTechnicalResources && this.technicalResourcesContent) ? this.technicalResourcesContent : undefined,
    };

    // Only call enabled AI endpoints — use of('') to skip disabled ones
    forkJoin({
      overview: this.enableAIOverview
        ? this.aiService.generateExecutiveSummary({ ...baseContext, prompt: this.selectedType!.AIPromptOverview || '' })
        : of(''),
      findings: this.enableAIFindings
        ? this.aiService.generateFindings({ ...baseContext, prompt: this.selectedType!.AIPromptFindings || '' })
        : of(''),
      recommendations: this.enableAIRecommendations
        ? this.aiService.generateRecommendations({ ...baseContext, prompt: this.selectedType!.AIPromptRecommendations || '' })
        : of(''),
      scope: this.enableAIScope
        ? this.aiService.generateScope({ ...baseContext, prompt: this.selectedType!.AIPromptScope || '' })
        : of(''),
    }).subscribe({
      next: (results) => {
        if (this.enableAIOverview) this.aiGeneratedOverview = results.overview;
        if (this.enableAIFindings) this.aiGeneratedFindings = results.findings;
        if (this.enableAIRecommendations) this.aiGeneratedRecommendations = results.recommendations;
        if (this.enableAIScope) this.aiGeneratedScope = results.scope;
        this.showAIPreview = true;
        this.isGeneratingAI = false;
        const enabled = [this.enableAIOverview && 'Overview', this.enableAIFindings && 'Findings', this.enableAIRecommendations && 'Recommendations', this.enableAIScope && 'Scope'].filter(Boolean).join(', ');
        const resourceNote = this.enableTechnicalResources && this.technicalResourcesFiles.length > 0
          ? ` (with ${this.technicalResourcesFiles.length} technical resource${this.technicalResourcesFiles.length > 1 ? 's' : ''})`
          : '';
        this.successMessage = `AI content generated: ${enabled}${resourceNote}`;
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

  // Professional Review
  performProfessionalReview(documentData: AssessmentDocumentData): void {
    this.isReviewing = true;
    this.showReviewResults = true;
    this.reviewRating = 0;
    this.reviewSuggestions = [];
    this.reviewSummary = 'Reviewing document...';

    // Build comprehensive document text for review — include all available content
    const sections: string[] = [];

    // Always include document metadata for context
    sections.push(`DOCUMENT: ${documentData.assessmentTitle}`);
    sections.push(`CLIENT: ${documentData.customerName}`);
    sections.push(`ASSESSMENT TYPE: ${documentData.assessmentType}`);
    sections.push(`PRACTICE AREA: ${documentData.practiceArea}`);
    sections.push('');

    // Include all text sections — use the best available content for each
    const overview = documentData.aiSummary || documentData.executiveSummary || '';
    if (overview.trim()) {
      sections.push('EXECUTIVE SUMMARY:\n' + overview);
    }

    if (documentData.scope && documentData.scope.trim()) {
      sections.push('SCOPE:\n' + documentData.scope);
    }

    const aiScope = documentData.aiScope || '';
    if (aiScope.trim() && aiScope !== documentData.scope) {
      sections.push('PROPOSED ASSESSMENT SCOPE:\n' + aiScope);
    }

    if (documentData.methodology && documentData.methodology.trim()) {
      sections.push('METHODOLOGY:\n' + documentData.methodology);
    }

    const findings = documentData.aiFindings || '';
    if (findings.trim()) {
      sections.push('FINDINGS:\n' + findings);
    }

    const recs = documentData.aiRecommendations || documentData.recommendations || '';
    if (recs.trim()) {
      sections.push('RECOMMENDATIONS:\n' + recs);
    }

    // Include pricing context
    if (documentData.estimatedHours && documentData.hourlyRate) {
      sections.push(`PRICING: ${documentData.estimatedHours} hours × $${documentData.hourlyRate}/hr = $${documentData.totalPrice}`);
    }

    const fullContent = sections.join('\n\n---\n\n');

    // Guard: If somehow there's still no meaningful content, show a helpful error
    if (fullContent.trim().length < 50) {
      this.isReviewing = false;
      this.reviewRating = 0;
      this.reviewSuggestions = ['The document has very little text content to review. Generate AI content first (Overview, Findings, Recommendations) before requesting a professional review.'];
      this.reviewSummary = 'Insufficient content for review.';
      return;
    }

    this.aiService.reviewDocument(
      fullContent,
      documentData.assessmentType,
      documentData.customerName
    ).subscribe({
      next: (result) => {
        this.reviewRating = result.rating;
        this.reviewSuggestions = result.suggestions;
        this.reviewSummary = result.summary;
        this.isReviewing = false;
      },
      error: (error) => {
        console.error('Professional review error:', error);
        this.reviewRating = 0;
        this.reviewSuggestions = ['Review failed. Please try again.'];
        this.reviewSummary = 'Unable to complete review.';
        this.isReviewing = false;
      }
    });
  }

  dismissReview(): void {
    this.showReviewResults = false;
    this.resetForm();
    this.activeTab = 'history';
  }

  // Debug: Show prompt that will be sent to Azure OpenAI
  showPromptDebug(): void {
    if (!this.selectedType || !this.selectedArchitecture || !this.customerName) {
      this.errorMessage = 'Please select an assessment type, reference architecture, and enter customer name first.';
      return;
    }

    const contactName = this.customerContact || this.customerName;
    const companyName = this.customerName;

    const context: AIGenerationContext = {
      prompt: this.selectedType.AIPromptOverview || '',
      customerName: contactName,
      companyName: companyName,
      customerEmail: this.customerEmail || '',
      assessmentType: this.selectedType.Name,
      assessmentTypeDescription: this.selectedType.Description || '',
      assessmentTypeCategory: this.selectedType.Category || '',
      referenceArchitecture: this.selectedArchitecture.Name,
      scopeContext: this.selectedType.ScopeTemplate || '',
      methodologyContext: this.selectedType.MethodologyTemplate || '',
      additionalNotes: this.customNotes || '',
    };

    this.aiService.debugPromptPreview(context).subscribe(preview => {
      this.debugSystemPrompt = preview.systemPrompt;
      this.debugUserPrompt = preview.userPrompt;
      this.debugModel = preview.model;
      this.debugConfigured = preview.configured;
      this.showDebugPrompt = true;
    });
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
