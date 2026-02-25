import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription, forkJoin, of } from 'rxjs';
import { SOWService, SOWType, ReferenceArchitecture, GeneratedSOW } from '../../shared/services/sow.service';
import { SOWAIService, SOWAIGenerationContext, SOWAIDocumentReviewResponse } from '../../shared/services/sow-ai.service';
import { CustomerManagementService, Customer } from '../../shared/services/customer-management.service';
import { SOWDocumentGeneratorService, SOWDocumentData } from '../../shared/services/sow-document-generator.service';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-sow-generator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sow-generator.component.html',
  styles: ``
})
export class SowGeneratorComponent implements OnInit, OnDestroy {
  // Data
  sowTypes: SOWType[] = [];
  referenceArchitectures: ReferenceArchitecture[] = [];
  generatedSOWs: GeneratedSOW[] = [];
  filteredSOWs: GeneratedSOW[] = [];
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
  sowTitle: string = '';
  customNotes: string = '';
  quoteId: string = '';

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
  selectedType: SOWType | null = null;
  selectedArchitecture: ReferenceArchitecture | null = null;

  // Pending auto-fill from quote navigation
  private pendingQuoteParams: Record<string, string> | null = null;
  fromQuote: boolean = false;
  quoteEstimatedHours: number = 0;
  quoteHourlyRate: number = 0;
  quoteTotalPrice: number = 0;

  private subscription: Subscription = new Subscription();

  constructor(
    private sowService: SOWService,
    private aiService: SOWAIService,
    private customerService: CustomerManagementService,
    private documentService: SOWDocumentGeneratorService,
    private authService: AuthService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.subscription.add(
      this.sowService.sowTypes$.subscribe(types => {
        this.sowTypes = types.filter(t => t.IsActive);
        this.tryAutoFillFromQuote();
      })
    );

    this.subscription.add(
      this.sowService.referenceArchitectures$.subscribe(archs => {
        this.referenceArchitectures = archs.filter(a => a.IsActive);
        this.tryAutoFillFromQuote();
      })
    );

    this.subscription.add(
      this.sowService.generatedSOWs$.subscribe(sows => {
        this.generatedSOWs = sows;
        this.applyFilters();
        this.isLoading = false;
      })
    );

    this.subscription.add(
      this.customerService.customers$.subscribe(customers => {
        this.customers = customers.filter(c => c.status === 'active' || c.Status === 'active');
        this.tryAutoFillFromQuote();
      })
    );

    this.loadData();

    // Check Azure OpenAI status
    this.aiService.checkAIStatus().subscribe(status => {
      this.aiConfigured = status.configured;
      this.aiModel = status.model || '';
    });

    // Check for query params (coming from Quote Management)
    this.route.queryParams.subscribe(params => {
      if (params['fromQuote'] === 'true') {
        // Store params and wait for data to load before auto-filling
        this.pendingQuoteParams = { ...params };
        this.fromQuote = true;
        // Set immediate fields that don't need data lookups
        this.quoteId = params['quoteId'] || '';
        this.customerName = params['customerName'] || '';
        this.customerContact = params['customerContact'] || '';
        this.customerEmail = params['customerEmail'] || '';
        this.customNotes = params['notes'] || '';
        this.quoteEstimatedHours = parseFloat(params['totalHours']) || 0;
        this.quoteHourlyRate = parseFloat(params['hourlyRate']) || 0;
        this.quoteTotalPrice = parseFloat(params['totalPrice']) || 0;
        this.activeTab = 'generate';
        this.tryAutoFillFromQuote();
      } else {
        if (params['quoteId']) {
          this.quoteId = params['quoteId'];
        }
        if (params['customerName']) {
          this.customerName = params['customerName'];
          this.updateTitle();
        }
      }
    });
  }

  /**
   * Attempt to auto-fill form fields from quote query params once data is loaded.
   * Called whenever reference architectures, SOW types, or customers finish loading.
   */
  private tryAutoFillFromQuote(): void {
    if (!this.pendingQuoteParams) return;
    const params = this.pendingQuoteParams;

    // Auto-match practice area by name from work items' referenceArchitecture
    if (!this.selectedArchitectureId && params['referenceArchitecture'] && this.referenceArchitectures.length > 0) {
      const archName = params['referenceArchitecture'].toLowerCase();
      const matched = this.referenceArchitectures.find(a =>
        (a.Name || '').toLowerCase() === archName ||
        (a.Name || '').toLowerCase().includes(archName) ||
        archName.includes((a.Name || '').toLowerCase())
      );
      if (matched && matched.Id) {
        this.selectedArchitectureId = matched.Id;
        this.selectedArchitecture = matched;
      }
    }

    // Auto-select first available SOW type if we have a practice area selected
    if (this.selectedArchitectureId && !this.selectedTypeId && this.sowTypes.length > 0) {
      const available = this.getAvailableSOWTypes();
      if (available.length > 0) {
        this.selectedTypeId = available[0].Id!;
        this.onTypeChange();
      }
    }

    // Auto-match customer by name
    if (!this.selectedCustomerId && params['customerName'] && this.customers.length > 0) {
      const name = params['customerName'].toLowerCase();
      const matched = this.customers.find(c => {
        const company = (c.company || c.Company || '').toLowerCase();
        const cName = (c.name || c.Name || '').toLowerCase();
        return company === name || cName === name || company.includes(name) || name.includes(company);
      });
      if (matched) {
        this.selectedCustomerId = (matched.id || matched.Id)!;
        // Keep quote-provided values (don't override with customer record values)
      }
    }

    this.updateTitle();

    // Clear pending params once everything is filled (or best effort complete)
    if (this.referenceArchitectures.length > 0 && this.sowTypes.length > 0 && this.customers.length > 0) {
      this.pendingQuoteParams = null;
      if (this.fromQuote) {
        this.successMessage = `Pre-filled from Quote ${this.quoteId ? '(' + this.quoteId.substring(0, 8) + '...)' : ''}. Review the details and generate your SOW.`;
      }
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  loadData(): void {
    this.isLoading = true;
    this.sowService.loadReferenceArchitectures(true).subscribe();
    this.sowService.loadSOWTypes(true).subscribe();
    this.sowService.loadGeneratedSOWs().subscribe();
  }

  onTypeChange(): void {
    this.selectedType = this.sowTypes.find(t => t.Id === this.selectedTypeId) || null;
    if (this.selectedType) {
      this.enableAIOverview = !!(this.selectedType.AIPromptOverview && this.selectedType.AIPromptOverview.trim());
      this.enableAIFindings = !!(this.selectedType.AIPromptFindings && this.selectedType.AIPromptFindings.trim());
      this.enableAIRecommendations = !!(this.selectedType.AIPromptRecommendations && this.selectedType.AIPromptRecommendations.trim());
      this.enableAIScope = !!(this.selectedType.AIPromptScope && this.selectedType.AIPromptScope.trim());
      this.enableTechnicalResources = !!(this.selectedType.ResourceFolder && this.selectedType.ResourceFolder.trim());
      this.technicalResourcesContent = '';
      this.technicalResourcesFiles = [];
      this.resourcesLoaded = false;
    }
    this.updateTitle();
  }

  onArchitectureChange(): void {
    this.selectedArchitecture = this.referenceArchitectures.find(a => a.Id === this.selectedArchitectureId) || null;
    this.selectedTypeId = '';
    this.selectedType = null;
    this.updateTitle();
  }

  getAvailableSOWTypes(): SOWType[] {
    if (!this.selectedArchitectureId) {
      return [];
    }
    return this.sowTypes.filter(type => {
      if (!type.ReferenceArchitectures || type.ReferenceArchitectures.length === 0) {
        return true;
      }
      return type.ReferenceArchitectures.some(ra => ra.Id === this.selectedArchitectureId);
    });
  }

  updateTitle(): void {
    if (this.customerName && this.selectedType) {
      this.sowTitle = `${this.customerName} - ${this.selectedType.Name}`;
      if (this.selectedArchitecture) {
        this.sowTitle += ` (${this.selectedArchitecture.Name})`;
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

  canGenerate(): boolean {
    const hasCustomer = !!(this.selectedCustomerId || (this.fromQuote && this.customerName));
    return !!(this.selectedTypeId && this.selectedArchitectureId && hasCustomer && this.customerName && this.sowTitle);
  }

  async generateSOW(): Promise<void> {
    if (!this.canGenerate() || !this.selectedType) {
      return;
    }

    this.isGenerating = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const processedOverview = this.aiGeneratedOverview || this.processTemplate(this.selectedType.OverviewTemplate || '');
      const processedScope = this.aiGeneratedScope || this.processTemplate(this.selectedType.ScopeTemplate || '');
      const processedMethodology = this.processTemplate(this.selectedType.MethodologyTemplate || '');
      const processedDeliverables = this.processTemplate(this.selectedType.DeliverablesTemplate || '');
      const processedRecommendations = this.aiGeneratedRecommendations || this.processTemplate(this.selectedType.RecommendationsTemplate || '');

      const sow: GeneratedSOW = {
        SOWTypeId: this.selectedTypeId,
        ReferenceArchitectureId: this.selectedArchitectureId,
        QuoteId: this.quoteId || undefined,
        CustomerName: this.customerName,
        CustomerContact: this.customerContact || undefined,
        CustomerEmail: this.customerEmail || undefined,
        Title: this.sowTitle,
        ExecutiveSummary: processedOverview,
        Scope: processedScope,
        Methodology: processedMethodology,
        Findings: this.aiGeneratedFindings || '',
        Recommendations: processedRecommendations,
        NextSteps: processedDeliverables,
        EstimatedHours: (this.fromQuote && this.quoteEstimatedHours) ? this.quoteEstimatedHours : (this.selectedType.DefaultHours || 40),
        HourlyRate: (this.fromQuote && this.quoteHourlyRate) ? this.quoteHourlyRate : (this.selectedType.DefaultRate || 175),
        Status: 'draft',
        GeneratedBy: this.authService.getCurrentUser()?.name || this.authService.getCurrentUser()?.email || undefined,
        Notes: this.customNotes || undefined
      };

      const estHours = (this.fromQuote && this.quoteEstimatedHours) ? this.quoteEstimatedHours : (this.selectedType.DefaultHours || 40);
      const estRate = (this.fromQuote && this.quoteHourlyRate) ? this.quoteHourlyRate : (this.selectedType.DefaultRate || 175);

      const documentData: SOWDocumentData = {
        customerName: this.customerName,
        customerContact: this.customerContact || this.customerName,
        sowTitle: this.sowTitle,
        practiceArea: this.selectedArchitecture?.Name || '',
        sowType: this.selectedType.Name,
        executiveSummary: processedOverview,
        scope: processedScope,
        methodology: processedMethodology,
        recommendations: processedRecommendations,
        estimatedHours: estHours,
        hourlyRate: estRate,
        totalPrice: (this.fromQuote && this.quoteTotalPrice) ? this.quoteTotalPrice : (estHours * estRate),
        templateFileName: this.selectedType.TemplateFileName || 'SOW-Template.docx',
        aiSummary: this.aiGeneratedOverview || '',
        aiFindings: this.aiGeneratedFindings || '',
        aiRecommendations: this.aiGeneratedRecommendations || '',
        aiScope: this.aiGeneratedScope || ''
      };

      this.sowService.createGeneratedSOW(sow).subscribe({
        next: async (created) => {
          if (created && created.Id) {
            try {
              const documentBlob = await this.documentService.generateDocument(documentData);

              const reader = new FileReader();
              reader.onloadend = () => {
                const base64Data = (reader.result as string).split(',')[1];
                const fileName = `${this.customerName.replace(/[^a-zA-Z0-9]/g, '_')}_SOW_${new Date().toISOString().split('T')[0]}.docx`;

                this.sowService.updateSOWDocument(created.Id!, fileName, base64Data).subscribe({
                  next: (success) => {
                    if (success) {
                      const url = window.URL.createObjectURL(documentBlob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = fileName;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      window.URL.revokeObjectURL(url);

                      this.successMessage = `SOW "${this.sowTitle}" created and document saved!`;
                    } else {
                      this.successMessage = `SOW "${this.sowTitle}" created! (Document save failed)`;
                    }

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
                    this.successMessage = `SOW "${this.sowTitle}" created! (Document save failed)`;
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
              this.successMessage = `SOW "${this.sowTitle}" created! (Document generation failed)`;
              this.resetForm();
              this.activeTab = 'history';
              this.isGenerating = false;
            }
          } else {
            this.errorMessage = 'Failed to create SOW. Please try again.';
            this.isGenerating = false;
          }
        },
        error: (error) => {
          console.error('Error creating SOW:', error);
          this.errorMessage = 'An error occurred while creating the SOW.';
          this.isGenerating = false;
        }
      });
    } catch (error) {
      console.error('Error generating SOW:', error);
      this.errorMessage = 'An error occurred while generating the SOW.';
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
    this.sowTitle = '';
    this.customNotes = '';
    this.quoteId = '';
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
    this.fromQuote = false;
    this.quoteEstimatedHours = 0;
    this.quoteHourlyRate = 0;
    this.quoteTotalPrice = 0;
    this.pendingQuoteParams = null;
  }

  // AI Content Generation
  generateAIContent(): void {
    if (!this.selectedType || !this.selectedArchitecture || !this.customerName) {
      this.errorMessage = 'Please select a SOW type, practice area, and enter customer name first.';
      return;
    }

    if (!this.enableAIOverview && !this.enableAIFindings && !this.enableAIRecommendations && !this.enableAIScope) {
      this.errorMessage = 'Please enable at least one AI content section to generate.';
      return;
    }

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
          this.doGenerateAIContent();
        },
        error: () => {
          this.isLoadingResources = false;
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

    const baseContext: SOWAIGenerationContext = {
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
      temperature: this.selectedType!.AITemperature,
    };

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
        const enabled = [this.enableAIOverview && 'Executive Summary', this.enableAIFindings && 'Findings', this.enableAIRecommendations && 'Recommendations', this.enableAIScope && 'Scope'].filter(Boolean).join(', ');
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
    this.showAIPreview = false;
    this.successMessage = 'AI content will be included in the generated SOW.';
  }

  performProfessionalReview(documentData: SOWDocumentData): void {
    this.isReviewing = true;
    this.showReviewResults = true;
    this.reviewRating = 0;
    this.reviewSuggestions = [];
    this.reviewSummary = 'Reviewing document...';

    const sections: string[] = [];
    sections.push(`DOCUMENT: ${documentData.sowTitle}`);
    sections.push(`CLIENT: ${documentData.customerName}`);
    sections.push(`SOW TYPE: ${documentData.sowType}`);
    sections.push(`PRACTICE AREA: ${documentData.practiceArea}`);
    sections.push('');

    const overview = documentData.aiSummary || documentData.executiveSummary || '';
    if (overview.trim()) sections.push('EXECUTIVE SUMMARY:\n' + overview);
    if (documentData.scope?.trim()) sections.push('SCOPE:\n' + documentData.scope);
    const aiScope = documentData.aiScope || '';
    if (aiScope.trim() && aiScope !== documentData.scope) sections.push('PROPOSED SCOPE:\n' + aiScope);
    if (documentData.methodology?.trim()) sections.push('METHODOLOGY:\n' + documentData.methodology);
    const findings = documentData.aiFindings || '';
    if (findings.trim()) sections.push('FINDINGS:\n' + findings);
    const recs = documentData.aiRecommendations || documentData.recommendations || '';
    if (recs.trim()) sections.push('RECOMMENDATIONS:\n' + recs);
    if (documentData.estimatedHours && documentData.hourlyRate) {
      sections.push(`PRICING: ${documentData.estimatedHours} hours × $${documentData.hourlyRate}/hr = $${documentData.totalPrice}`);
    }

    const fullContent = sections.join('\n\n---\n\n');

    if (fullContent.trim().length < 50) {
      this.isReviewing = false;
      this.reviewRating = 0;
      this.reviewSuggestions = ['The document has very little text content to review. Generate AI content first before requesting a professional review.'];
      this.reviewSummary = 'Insufficient content for review.';
      return;
    }

    this.aiService.reviewDocument(fullContent, documentData.sowType, documentData.customerName).subscribe({
      next: (result) => {
        this.reviewRating = result.rating;
        this.reviewSuggestions = result.suggestions;
        this.reviewSummary = result.summary;
        this.isReviewing = false;
      },
      error: () => {
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

  showPromptDebug(): void {
    if (!this.selectedType || !this.selectedArchitecture || !this.customerName) {
      this.errorMessage = 'Please select a SOW type, practice area, and enter customer name first.';
      return;
    }

    const context: SOWAIGenerationContext = {
      prompt: this.selectedType.AIPromptOverview || '',
      customerName: this.customerContact || this.customerName,
      companyName: this.customerName,
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
    let filtered = this.generatedSOWs;

    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(s => s.Status === this.statusFilter);
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        (s.Title || '').toLowerCase().includes(term) ||
        (s.CustomerName || '').toLowerCase().includes(term) ||
        (s.SOWTypeName || '').toLowerCase().includes(term)
      );
    }

    this.filteredSOWs = filtered;
  }

  setStatusFilter(status: string): void {
    this.statusFilter = status;
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  downloadSOW(sow: GeneratedSOW): void {
    if (sow.Id) {
      this.sowService.downloadSOW(sow.Id);
    }
  }

  deleteSOW(sow: GeneratedSOW): void {
    if (sow.Id && confirm(`Are you sure you want to delete "${sow.Title}"?`)) {
      this.sowService.deleteGeneratedSOW(sow.Id).subscribe(success => {
        if (success) {
          this.successMessage = 'SOW deleted successfully.';
        } else {
          this.errorMessage = 'Failed to delete SOW.';
        }
      });
    }
  }

  updateStatus(sow: GeneratedSOW, status: string): void {
    if (sow.Id) {
      this.sowService.updateSOWStatus(sow.Id, status).subscribe(success => {
        if (!success) {
          this.errorMessage = 'Failed to update SOW status.';
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
