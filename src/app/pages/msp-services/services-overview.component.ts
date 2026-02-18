import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MSPOfferingsService, MSPOffering, MSPServiceLevel, PricingUnit } from '../../shared/services/msp-offerings.service';
import { PricingUnitOption, PricingUnitsService } from '../../shared/services/pricing-units.service';

@Component({
  selector: 'app-services-overview',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './services-overview.component.html',
  styleUrl: './services-overview.component.css',
})
export class ServicesOverviewComponent {
  offerings: MSPOffering[] = [];
  pricingUnits: PricingUnitOption[] = [];

  constructor(
    private offeringsService: MSPOfferingsService,
    private pricingUnitsService: PricingUnitsService
  ) {}

  ngOnInit(): void {
    this.pricingUnits = this.pricingUnitsService.getUnits();
    this.offeringsService.getOfferings().subscribe(offerings => {
      this.offerings = offerings.filter(offering => offering.isActive);
    });
  }

  getCategoryIcon(category: MSPOffering['category'] | undefined): string {
    const icons: Record<string, string> = {
      backup: '💾',
      support: '📞',
      database: '🗄️',
      consulting: '🎯'
    };
    return icons[category as string] || '🧩';
  }

  getDefaultLevel(offering: MSPOffering): MSPServiceLevel | null {
    return offering.serviceLevels[0] || null;
  }

  getPricingUnitLabel(unit: PricingUnit): string {
    const match = this.pricingUnits.find(option => option.value === unit);
    return match?.suffix || '/unit/mo';
  }

  getPerUnitTotal(level: MSPServiceLevel): number {
    const license = level.basePrice || 0;
    const professionalServices = level.professionalServicesPrice || 0;
    return license + professionalServices;
  }
}
