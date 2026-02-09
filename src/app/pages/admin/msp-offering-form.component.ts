import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { MSPOfferingsService, MSPOffering, MSPOption, MSPServiceLevel, PricingUnit } from '../../shared/services/msp-offerings.service';

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
  errorMessage: string = '';
  successMessage: string = '';
  showOptionForm = false;

  // Form fields
  name: string = '';
  description: string = '';
  category: 'backup' | 'support' | 'database' | 'consulting' = 'backup';
  setupFee: number = 0;
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
  newLevelPricingUnit: PricingUnit = 'per-user';

  newOptionName: string = '';
  newOptionDescription: string = '';
  newOptionPrice: number = 0;
  newOptionPricingUnit: PricingUnit = 'per-user';

  categories = [
    { value: 'backup', label: 'Backup Solutions' },
    { value: 'support', label: 'Support Services' },
    { value: 'database', label: 'Database Management' },
    { value: 'consulting', label: 'Consulting' }
  ];

  pricingUnits = [
    { value: 'per-user', label: 'Per User Per Month' },
    { value: 'per-gb', label: 'Per GB Per Month' },
    { value: 'per-device', label: 'Per Device Per Month' },
    { value: 'one-time', label: 'One Time Only' }
  ];

  constructor(
    private offeringsService: MSPOfferingsService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
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
    const offering = this.offeringsService.getOfferingById(id);
    if (offering) {
      this.name = offering.name;
      this.description = offering.description;
      this.category = offering.category;
      this.setupFee = offering.setupFee;
      this.isActive = offering.isActive;
      this.features = [...offering.features];
      this.serviceLevels = offering.serviceLevels.map(level => ({
        ...level,
        options: [...level.options]
      }));
      this.selectLevel(this.serviceLevels[0] || null);
    }
  }

  selectLevel(level: MSPServiceLevel | null): void {
    this.selectedLevel = level;
    this.selectedLevelId = level ? level.id : null;
    this.newOptionPricingUnit = level ? level.pricingUnit : 'per-user';
    this.showOptionForm = false;
    this.errorMessage = '';
  }

  addServiceLevel(): void {
    if (!this.newLevelName.trim()) {
      this.errorMessage = 'Service level name is required';
      return;
    }
    if (this.newLevelPrice < 0) {
      this.errorMessage = 'Service level price cannot be negative';
      return;
    }

    const level: MSPServiceLevel = {
      id: `level-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: this.newLevelName.trim(),
      basePrice: this.newLevelPrice,
      pricingUnit: this.newLevelPricingUnit,
      options: []
    };

    this.serviceLevels.push(level);
    this.selectLevel(level);
    this.newLevelName = '';
    this.newLevelPrice = 0;
    this.newLevelPricingUnit = 'per-user';
    this.showLevelForm = false;
    this.errorMessage = '';
  }

  startEditLevel(level: MSPServiceLevel): void {
    this.editingLevels[level.id] = true;
    this.levelDrafts[level.id] = { ...level, options: [...level.options] };
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
    if (draft.basePrice < 0) {
      this.errorMessage = 'Service level price cannot be negative';
      return;
    }

    level.name = draft.name.trim();
    level.basePrice = draft.basePrice;
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

  addOption(): void {
    if (!this.selectedLevel) {
      this.errorMessage = 'Select a service level before adding options';
      return;
    }
    if (!this.newOptionName.trim()) {
      this.errorMessage = 'Option name is required';
      return;
    }
    if (this.newOptionPrice < 0) {
      this.errorMessage = 'Option price cannot be negative';
      return;
    }

    const option: MSPOption = {
      id: `opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: this.newOptionName.trim(),
      description: this.newOptionDescription.trim(),
      monthlyPrice: this.newOptionPrice,
      pricingUnit: this.newOptionPricingUnit
    };

    this.selectedLevel.options.push(option);
    this.newOptionName = '';
    this.newOptionDescription = '';
    this.newOptionPrice = 0;
    this.newOptionPricingUnit = this.selectedLevel.pricingUnit;
    this.showOptionForm = false;
    this.errorMessage = '';
  }

  startEditOption(option: MSPOption): void {
    this.editingOptions[option.id] = true;
    this.optionDrafts[option.id] = { ...option };
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
    if (draft.monthlyPrice < 0) {
      this.errorMessage = 'Option price cannot be negative';
      return;
    }

    option.name = draft.name.trim();
    option.description = draft.description.trim();
    option.monthlyPrice = draft.monthlyPrice;
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

    if (this.setupFee < 0) {
      this.errorMessage = 'Setup fee cannot be negative';
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
      if (this.isEditMode && this.offeringId) {
        this.offeringsService.updateOffering(this.offeringId, {
          name: this.name.trim(),
          description: this.description.trim(),
          category: this.category,
          setupFee: this.setupFee,
          isActive: this.isActive,
          features: this.features,
          serviceLevels: this.serviceLevels
        });
        this.successMessage = 'Offering updated successfully!';
      } else {
        this.offeringsService.createOffering({
          name: this.name.trim(),
          description: this.description.trim(),
          category: this.category,
          setupFee: this.setupFee,
          isActive: this.isActive,
          features: this.features,
          serviceLevels: this.serviceLevels
        });
        this.successMessage = 'Offering created successfully!';
      }

      setTimeout(() => {
        this.router.navigate(['/admin/offerings']);
      }, 1500);
    } catch (error) {
      this.errorMessage = 'An error occurred. Please try again.';
      console.error('Error saving offering:', error);
    }
  }

  cancel(): void {
    this.router.navigate(['/admin/offerings']);
  }

  getPricingUnitLabel(unit: PricingUnit): string {
    const labels: { [key in PricingUnit]: string } = {
      'per-user': '/user/mo',
      'per-gb': '/GB/mo',
      'per-device': '/device/mo',
      'one-time': '/one-time'
    };
    return labels[unit];
  }
}
