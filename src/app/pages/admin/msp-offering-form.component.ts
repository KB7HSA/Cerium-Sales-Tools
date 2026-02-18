import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { MSPOfferingsService, MSPOffering, MSPOption, MSPServiceLevel, PricingUnit } from '../../shared/services/msp-offerings.service';
import { PricingUnitOption, PricingUnitsService } from '../../shared/services/pricing-units.service';

@Component({
  selector: 'app-msp-offering-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './msp-offering-form.component.html',
  styleUrl: './msp-offering-form.component.css'
})
export class MSPOfferingFormComponent implements OnInit {
  isEditMode = false;
  offeringId: string | null = null;
  submitted = false;
  isSaving = false;
  errorMessage: string = '';
  successMessage: string = '';
  imageErrorMessage: string = '';
  imageWarningMessage: string = '';
  showOptionForm = false;
  readonly maxImageSizeBytes = 1024 * 1024;
  readonly minImageWidth = 600;
  readonly minImageHeight = 400;

  // Form fields
  name: string = '';
  description: string = '';
  imageUrl: string = '';
  category: 'backup' | 'support' | 'database' | 'consulting' = 'backup';
  setupFee: number = 0;
  setupFeeCost: number = 0;
  setupFeeMargin: number = 0;
  isActive: boolean = true;
  features: string[] = [];
  newFeature: string = '';
  serviceLevels: MSPServiceLevel[] = [];
  selectedLevelId: string | null = null;
  selectedLevel: MSPServiceLevel | null = null;
  editingLevels: Record<string, boolean> = {};
  levelDrafts: Record<string, MSPServiceLevel> = {};
  editingOptions: Record<string, boolean> = {};
  optionDrafts: Record<string, MSPOption> = {};

  // New option form
  showLevelForm = false;
  newLevelName: string = '';
  newLevelPrice: number = 0;
  newLevelLicenseCost: number = 0;
  newLevelLicenseMargin: number = 0;
  newLevelProfessionalServicesCost: number = 0;
  newLevelProfessionalServicesMargin: number = 0;
  newLevelProfessionalServicesPrice: number = 0;
  newLevelPricingUnit: PricingUnit = 'per-user';

  newOptionName: string = '';
  newOptionDescription: string = '';
  newOptionPrice: number = 0;
  newOptionCost: number = 0;
  newOptionMargin: number = 0;
  newOptionPricingUnit: PricingUnit = 'per-user';

  categories = [
    { value: 'backup', label: 'Backup Solutions' },
    { value: 'support', label: 'Support Services' },
    { value: 'database', label: 'Database Management' },
    { value: 'consulting', label: 'Consulting' }
  ];

  pricingUnits: PricingUnitOption[] = [];

  constructor(
    private offeringsService: MSPOfferingsService,
    private pricingUnitsService: PricingUnitsService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.pricingUnits = this.pricingUnitsService.getUnits();
    this.syncPricingUnitSelections();
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEditMode = true;
        this.offeringId = id;
        this.loadOffering(id);
      }
    });
  }

  loadOffering(id: string): void {
    // Fetch offering directly from API to ensure we get the latest data with features/serviceLevels
    this.offeringsService.getOfferingByIdFromApi(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const offering = response.data;
          console.log('[MSPOfferingFormComponent] Loaded offering:', offering);
          
          this.name = (offering.name || offering.Name) ?? '';
          this.description = (offering.description || offering.Description) ?? '';
          this.imageUrl = (offering.imageUrl || offering.ImageUrl) || '';
          this.category = (offering.category || offering.Category) as 'backup' | 'support' | 'database' | 'consulting' || 'backup';
          this.setupFeeCost = offering.setupFeeCost ?? offering.SetupFeeCost ?? 0;
          this.setupFeeMargin = offering.setupFeeMargin ?? offering.SetupFeeMargin ?? 0;
          this.setupFee = this.calculatePrice(this.setupFeeCost, this.setupFeeMargin);
          this.isActive = (offering.isActive ?? offering.IsActive) !== false;
          
          // Handle both camelCase and PascalCase from backend
          this.features = [...((offering.features || (offering as any).Features) ?? [])];
          console.log('[MSPOfferingFormComponent] Features loaded:', this.features);
          
          const serviceLevels = (offering.serviceLevels || (offering as any).ServiceLevels) ?? [];
          console.log('[MSPOfferingFormComponent] Service levels loaded:', serviceLevels);
          
          // Map to camelCase ONLY — do NOT spread the original PascalCase object,
          // otherwise stale PascalCase values override updated camelCase on save.
          this.serviceLevels = serviceLevels.map(level => {
            const lvl = level as any;
            return {
              id: level.id || lvl.Id,
              name: level.name || lvl.Name || '',
              basePrice: level.basePrice ?? lvl.BasePrice ?? 0,
              baseCost: level.baseCost ?? lvl.BaseCost ?? 0,
              marginPercent: level.marginPercent ?? lvl.MarginPercent ?? 0,
              licenseCost: level.licenseCost ?? lvl.LicenseCost ?? level.baseCost ?? lvl.BaseCost ?? 0,
              licenseMargin: level.licenseMargin ?? lvl.LicenseMargin ?? level.marginPercent ?? lvl.MarginPercent ?? 0,
              professionalServicesPrice: level.professionalServicesPrice ?? lvl.ProfessionalServicesPrice ?? 0,
              professionalServicesCost: level.professionalServicesCost ?? lvl.ProfessionalServicesCost ?? 0,
              professionalServicesMargin: level.professionalServicesMargin ?? lvl.ProfessionalServicesMargin ?? 0,
              pricingUnit: level.pricingUnit || lvl.PricingUnit || 'per-user',
              options: ((level.options || lvl.Options) ?? []).map(option => {
                const opt = option as any;
                return {
                  id: option.id || opt.Id,
                  name: option.name || opt.Name || '',
                  description: option.description || opt.Description || '',
                  monthlyPrice: option.monthlyPrice ?? opt.MonthlyPrice ?? 0,
                  monthlyCost: option.monthlyCost ?? opt.MonthlyCost ?? 0,
                  marginPercent: option.marginPercent ?? opt.MarginPercent ?? 0,
                  pricingUnit: option.pricingUnit || opt.PricingUnit || 'per-user'
                };
              })
            };
          });
          
          console.log('[MSPOfferingFormComponent] Normalized service levels:', this.serviceLevels);
          this.selectLevel(this.serviceLevels[0] || null);
        }
      },
      error: (error) => {
        console.error('[MSPOfferingFormComponent] Failed to load offering:', error);
        this.errorMessage = 'Failed to load offering details';
      }
    });
  }

  selectLevel(level: MSPServiceLevel | null): void {
    this.selectedLevel = level;
    this.selectedLevelId = level ? level.id : null;
    this.newOptionPricingUnit = level ? level.pricingUnit : this.getDefaultPricingUnit();
    this.showOptionForm = false;
    this.errorMessage = '';
  }

  addServiceLevel(): void {
    if (!this.newLevelName.trim()) {
      this.errorMessage = 'Service level name is required';
      return;
    }
    if (this.newLevelLicenseCost < 0) {
      this.errorMessage = 'License cost cannot be negative';
      return;
    }

    const basePrice = this.calculatePrice(this.newLevelLicenseCost, this.newLevelLicenseMargin);
    const professionalServicesPrice = this.calculatePrice(
      this.newLevelProfessionalServicesCost,
      this.newLevelProfessionalServicesMargin
    );

    const level: MSPServiceLevel = {
      id: `level-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: this.newLevelName.trim(),
      basePrice,
      baseCost: this.newLevelLicenseCost,
      marginPercent: this.newLevelLicenseMargin,
      licenseCost: this.newLevelLicenseCost,
      licenseMargin: this.newLevelLicenseMargin,
      professionalServicesCost: this.newLevelProfessionalServicesCost,
      professionalServicesMargin: this.newLevelProfessionalServicesMargin,
      professionalServicesPrice,
      pricingUnit: this.newLevelPricingUnit,
      options: []
    };

    this.serviceLevels.push(level);
    this.selectLevel(level);
    this.newLevelName = '';
    this.newLevelPrice = 0;
    this.newLevelLicenseCost = 0;
    this.newLevelLicenseMargin = 0;
    this.newLevelProfessionalServicesCost = 0;
    this.newLevelProfessionalServicesMargin = 0;
    this.newLevelProfessionalServicesPrice = 0;
    this.newLevelPricingUnit = this.getDefaultPricingUnit();
    this.showLevelForm = false;
    this.errorMessage = '';
  }

  startEditLevel(level: MSPServiceLevel): void {
    this.editingLevels[level.id] = true;
    this.levelDrafts[level.id] = {
      ...level,
      licenseCost: level.licenseCost ?? level.baseCost ?? level.basePrice ?? 0,
      licenseMargin: level.licenseMargin ?? level.marginPercent ?? 0,
      professionalServicesCost: level.professionalServicesCost ?? 0,
      professionalServicesMargin: level.professionalServicesMargin ?? 0,
      professionalServicesPrice: level.professionalServicesPrice ?? this.calculatePrice(
        level.professionalServicesCost ?? 0,
        level.professionalServicesMargin ?? 0
      ),
      options: [...level.options]
    };
    this.errorMessage = '';
  }

  cancelEditLevel(level: MSPServiceLevel): void {
    this.editingLevels[level.id] = false;
    this.levelDrafts[level.id] = { ...level, options: [...level.options] };
    this.errorMessage = '';
  }

  saveEditLevel(level: MSPServiceLevel): void {
    const draft = this.levelDrafts[level.id];
    if (!draft || !draft.name.trim()) {
      this.errorMessage = 'Service level name is required';
      return;
    }
    if ((draft.licenseCost ?? 0) < 0) {
      this.errorMessage = 'License cost cannot be negative';
      return;
    }

    level.name = draft.name.trim();
    level.licenseCost = draft.licenseCost ?? 0;
    level.licenseMargin = draft.licenseMargin ?? 0;
    level.baseCost = draft.licenseCost ?? 0;
    level.marginPercent = draft.licenseMargin ?? 0;
    level.basePrice = this.calculatePrice(level.licenseCost, level.licenseMargin);
    level.professionalServicesCost = draft.professionalServicesCost ?? 0;
    level.professionalServicesMargin = draft.professionalServicesMargin ?? 0;
    level.professionalServicesPrice = this.calculatePrice(
      level.professionalServicesCost,
      level.professionalServicesMargin
    );
    level.pricingUnit = draft.pricingUnit;

    this.editingLevels[level.id] = false;
    this.selectLevel(level);
    this.errorMessage = '';
  }

  removeServiceLevel(index: number): void {
    const removed = this.serviceLevels.splice(index, 1)[0];
    if (removed && this.selectedLevelId === removed.id) {
      this.selectLevel(this.serviceLevels[0] || null);
    }
  }

  addFeature(): void {
    if (this.newFeature.trim() && !this.features.includes(this.newFeature.trim())) {
      this.features.push(this.newFeature.trim());
      this.newFeature = '';
    }
  }

  removeFeature(index: number): void {
    this.features.splice(index, 1);
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) {
      return;
    }
    this.imageErrorMessage = '';
    this.imageWarningMessage = '';
    if (!file.type.startsWith('image/')) {
      this.imageErrorMessage = 'Please select a valid image file.';
      input.value = '';
      return;
    }
    if (file.size > this.maxImageSizeBytes) {
      this.imageErrorMessage = 'Image must be 1 MB or smaller.';
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.imageUrl = typeof reader.result === 'string' ? reader.result : '';
      if (this.imageUrl) {
        const img = new Image();
        img.onload = () => {
          if (img.width < this.minImageWidth || img.height < this.minImageHeight) {
            this.imageWarningMessage = `Image is ${img.width}x${img.height}. Recommended at least ${this.minImageWidth}x${this.minImageHeight}.`;
          } else {
            this.imageWarningMessage = '';
          }
        };
        img.onerror = () => {
          this.imageWarningMessage = 'Unable to read image dimensions.';
        };
        img.src = this.imageUrl;
      }
    };
    reader.onerror = () => {
      this.imageErrorMessage = 'Unable to read image file.';
    };
    reader.readAsDataURL(file);
  }

  clearImage(): void {
    this.imageUrl = '';
    this.imageErrorMessage = '';
    this.imageWarningMessage = '';
  }

  addOption(): void {
    if (!this.selectedLevel) {
      this.errorMessage = 'Select a service level before adding options';
      return;
    }
    if (!this.newOptionName.trim()) {
      this.errorMessage = 'Option name is required';
      return;
    }
    if (this.newOptionCost < 0) {
      this.errorMessage = 'Option cost cannot be negative';
      return;
    }

    const monthlyPrice = this.calculatePrice(this.newOptionCost, this.newOptionMargin);
    const option: MSPOption = {
      id: `opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: this.newOptionName.trim(),
      description: this.newOptionDescription.trim(),
      monthlyPrice,
      monthlyCost: this.newOptionCost,
      marginPercent: this.newOptionMargin,
      pricingUnit: this.newOptionPricingUnit
    };

    this.selectedLevel.options.push(option);
    this.newOptionName = '';
    this.newOptionDescription = '';
    this.newOptionPrice = 0;
    this.newOptionCost = 0;
    this.newOptionMargin = 0;
    this.newOptionPricingUnit = this.selectedLevel.pricingUnit;
    this.showOptionForm = false;
    this.errorMessage = '';
  }

  startEditOption(option: MSPOption): void {
    this.editingOptions[option.id] = true;
    this.optionDrafts[option.id] = {
      ...option,
      monthlyCost: option.monthlyCost ?? option.monthlyPrice ?? 0,
      marginPercent: option.marginPercent ?? 0
    };
    this.errorMessage = '';
  }

  cancelEditOption(option: MSPOption): void {
    this.editingOptions[option.id] = false;
    this.optionDrafts[option.id] = { ...option };
    this.errorMessage = '';
  }

  saveEditOption(option: MSPOption): void {
    const draft = this.optionDrafts[option.id];
    if (!draft || !draft.name.trim()) {
      this.errorMessage = 'Option name is required';
      return;
    }
    if ((draft.monthlyCost ?? 0) < 0) {
      this.errorMessage = 'Option cost cannot be negative';
      return;
    }

    option.name = draft.name.trim();
    option.description = draft.description.trim();
    option.monthlyCost = draft.monthlyCost ?? 0;
    option.marginPercent = draft.marginPercent ?? 0;
    option.monthlyPrice = this.calculatePrice(option.monthlyCost, option.marginPercent);
    option.pricingUnit = draft.pricingUnit;

    this.editingOptions[option.id] = false;
    this.errorMessage = '';
  }

  removeOption(index: number): void {
    if (this.selectedLevel) {
      this.selectedLevel.options.splice(index, 1);
    }
  }

  submitForm(): void {
    this.submitted = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.name.trim()) {
      this.errorMessage = 'Offering name is required';
      return;
    }

    if (!this.description.trim()) {
      this.errorMessage = 'Description is required';
      return;
    }

    if (this.setupFeeCost < 0) {
      this.errorMessage = 'Setup fee cost cannot be negative';
      return;
    }

    if (this.features.length === 0) {
      this.errorMessage = 'At least one feature is required';
      return;
    }

    if (this.serviceLevels.length === 0) {
      this.errorMessage = 'At least one service level is required';
      return;
    }

    try {
      this.setupFee = this.calculatePrice(this.setupFeeCost, this.setupFeeMargin);
      this.isSaving = true;
      this.errorMessage = '';

      const offeringData = {
        name: this.name.trim(),
        description: this.description.trim(),
        imageUrl: this.imageUrl,
        category: this.category,
        setupFee: this.setupFee,
        setupFeeCost: this.setupFeeCost,
        setupFeeMargin: this.setupFeeMargin,
        isActive: this.isActive,
        features: this.features,
        serviceLevels: this.serviceLevels
      };

      console.log('[MSPOfferingFormComponent] Offering data being sent:', {
        name: offeringData.name,
        featuresCount: offeringData.features.length,
        serviceLevelsCount: offeringData.serviceLevels.length,
        firstServiceLevel: offeringData.serviceLevels[0] ? JSON.stringify(offeringData.serviceLevels[0], null, 2) : null
      });

      if (this.isEditMode && this.offeringId) {
        console.log('[MSPOfferingFormComponent] Updating offering:', this.offeringId);
        this.offeringsService.updateOffering(this.offeringId, offeringData)
          .subscribe({
            next: (response) => {
              console.log('[MSPOfferingFormComponent] Update response:', response);
              this.isSaving = false;
              this.successMessage = 'Offering updated successfully!';
              setTimeout(() => {
                this.router.navigate(['/admin/offerings']);
              }, 1500);
            },
            error: (error) => {
              console.error('[MSPOfferingFormComponent] Update error:', error);
              this.isSaving = false;
              this.errorMessage = error?.error?.message || 'Failed to update offering. Please try again.';
            }
          });
      } else {
        console.log('[MSPOfferingFormComponent] Creating new offering');
        this.offeringsService.createOffering(offeringData)
          .subscribe({
            next: (response) => {
              console.log('[MSPOfferingFormComponent] Create response:', response);
              this.isSaving = false;
              this.successMessage = 'Offering created successfully!';
              setTimeout(() => {
                this.router.navigate(['/admin/offerings']);
              }, 1500);
            },
            error: (error) => {
              console.error('[MSPOfferingFormComponent] Create error:', error);
              this.isSaving = false;
              this.errorMessage = error?.error?.message || 'Failed to create offering. Please try again.';
            }
          });
      }
    } catch (error) {
      this.errorMessage = 'An error occurred. Please try again.';
      this.isSaving = false;
      console.error('[MSPOfferingFormComponent] Error saving offering:', error);
    }
  }

  cancel(): void {
    this.router.navigate(['/admin/offerings']);
  }

  getPricingUnitLabel(unit: PricingUnit): string {
    const match = this.pricingUnits.find(option => option.value === unit);
    return match?.suffix || '/unit/mo';
  }

  private syncPricingUnitSelections(): void {
    if (!this.pricingUnits.some(option => option.enabled)) {
      const fallback = this.pricingUnits.find(option => option.value === 'per-user') || this.pricingUnits[0];
      if (fallback) {
        fallback.enabled = true;
        this.savePricingUnits();
      }
    }

    const defaultUnit = this.getDefaultPricingUnit();
    if (!this.isUnitEnabled(this.newLevelPricingUnit)) {
      this.newLevelPricingUnit = defaultUnit;
    }
    if (!this.isUnitEnabled(this.newOptionPricingUnit)) {
      this.newOptionPricingUnit = this.selectedLevel?.pricingUnit || defaultUnit;
    }
  }

  private getDefaultPricingUnit(): PricingUnit {
    const enabled = this.pricingUnits.find(option => option.enabled);
    return enabled?.value || 'per-user';
  }

  private isUnitEnabled(unit: PricingUnit): boolean {
    return this.pricingUnits.some(option => option.value === unit && option.enabled);
  }

  private savePricingUnits(): void {
    this.pricingUnitsService.saveUnits(this.pricingUnits);
  }

  calculatePrice(cost: number, marginPercent: number): number {
    return Number((cost * (1 + marginPercent / 100)).toFixed(2));
  }

  updateSetupFeeFromCost(): void {
    this.setupFee = this.calculatePrice(this.setupFeeCost, this.setupFeeMargin);
  }
}
