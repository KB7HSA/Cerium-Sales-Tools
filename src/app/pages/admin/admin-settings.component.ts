 
 import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PricingUnitOption, PricingUnitsService } from '../../shared/services/pricing-units.service';
import { LaborUnitsService } from '../../shared/services/labor-units.service';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-settings.component.html',
  styleUrl: './admin-settings.component.css'
})
export class AdminSettingsComponent implements OnInit {
  pricingUnits: PricingUnitOption[] = [];
  errorMessage = '';
  laborUnits: string[] = [];
  laborUnitErrorMessage = '';
  newLaborUnitName = '';

  constructor(
    private pricingUnitsService: PricingUnitsService,
    private laborUnitsService: LaborUnitsService
  ) {}

  ngOnInit(): void {
    this.pricingUnits = this.pricingUnitsService.getUnits();
    this.ensureAtLeastOneEnabled();
    this.laborUnitsService.getUnits$().subscribe(units => {
      this.laborUnits = units;
    });
  }

  persistPricingUnits(): void {
    this.pricingUnitsService.saveUnits(this.pricingUnits);
  }

  togglePricingUnit(unit: PricingUnitOption): void {
    const enabledCount = this.pricingUnits.filter(option => option.enabled).length;
    if (unit.enabled && enabledCount === 1) {
      this.errorMessage = 'At least one unit of measure must be enabled.';
      return;
    }

    unit.enabled = !unit.enabled;
    this.errorMessage = '';
    this.persistPricingUnits();
    this.ensureAtLeastOneEnabled();
  }

  resetPricingUnits(): void {
    this.pricingUnits = this.pricingUnitsService.resetUnits();
    this.errorMessage = '';
  }

  addLaborUnit(): void {
    this.laborUnitErrorMessage = '';
    if (!this.newLaborUnitName.trim()) {
      this.laborUnitErrorMessage = 'Unit name is required.';
      return;
    }
    const added = this.laborUnitsService.addUnit(this.newLaborUnitName);
    if (!added) {
      this.laborUnitErrorMessage = 'Unit name must be unique.';
      return;
    }
    this.newLaborUnitName = '';
  }

  deleteLaborUnit(unit: string): void {
    this.laborUnitErrorMessage = '';
    const deleted = this.laborUnitsService.deleteUnit(unit);
    if (!deleted) {
      this.laborUnitErrorMessage = 'At least one labor unit must remain.';
    }
  }

  resetLaborUnits(): void {
    this.laborUnitsService.resetUnits();
    this.laborUnitErrorMessage = '';
  }

  private ensureAtLeastOneEnabled(): void {
    if (this.pricingUnits.some(option => option.enabled)) {
      return;
    }

    if (this.pricingUnits.length > 0) {
      this.pricingUnits[0].enabled = true;
      this.persistPricingUnits();
    }
  }
}
