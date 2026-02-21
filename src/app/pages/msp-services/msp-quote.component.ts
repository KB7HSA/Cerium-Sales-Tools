import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { QuoteService, Quote } from '../../shared/services/quote.service';
import { MSPOfferingsService, MSPOffering, MSPOption, MSPServiceLevel, PricingUnit } from '../../shared/services/msp-offerings.service';
import { CustomerManagementService, Customer } from '../../shared/services/customer-management.service';
import { PricingUnitOption, PricingUnitsService } from '../../shared/services/pricing-units.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-msp-quote',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './msp-quote.component.html',
  styleUrl: './msp-quote.component.css',
})
export class MspQuoteComponent implements OnInit, OnDestroy {
  // Form inputs
  selectedCustomerId: string = '';
  quantity: number = 10;
  durationMonths: number = 12;
  selectedService: string = '';
  selectedServiceLevelId: string = '';

  // Offerings and pricing
  offerings: MSPOffering[] = [];
  currentOffering: MSPOffering | null = null;
  currentServiceLevel: MSPServiceLevel | null = null;
  services: string[] = [];
  customers: Customer[] = [];
  pricingUnits: PricingUnitOption[] = [];
  selectedOptionIds: string[] = [];

  // Configuration
  showSetupFee: boolean = true;
  showAnnualDiscount: boolean = true;
  annualDiscount: number = 10;

  // Calculated values
  monthlyPrice: number = 0;
  totalPrice: number = 0;
  discountAmount: number = 0;

  private subscription: Subscription = new Subscription();

  constructor(
    private activatedRoute: ActivatedRoute,
    private quoteService: QuoteService,
    private offeringsService: MSPOfferingsService,
    private customerService: CustomerManagementService,
    private pricingUnitsService: PricingUnitsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.pricingUnits = this.pricingUnitsService.getUnits();
    // Load offerings
    this.subscription.add(
      this.offeringsService.getOfferings().subscribe(offerings => {
        this.offerings = offerings.filter(o => o.isActive);
        this.services = this.offerings.map(o => (o.name || o.Name || 'Unnamed Service')).filter((name): name is string => !!name);
        
        // Set default service if not provided
        if (!this.selectedService && this.services.length > 0) {
          this.selectedService = this.services[0];
        }

        // Load service from query parameters if provided
        this.activatedRoute.queryParams.subscribe(params => {
          if (params['service'] && this.services.includes(params['service'])) {
            this.selectedService = params['service'];
          }
          this.onServiceChange();
        });
      })
    );

    this.subscription.add(
      this.customerService.customers$.subscribe(customers => {
        this.customers = customers.filter(customer => customer.status === 'active');
        if (!this.selectedCustomerId && this.customers.length > 0) {
          this.selectedCustomerId = this.customers[0].id || '';
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  onServiceChange(): void {
    this.currentOffering = this.offerings.find(o => o.name === this.selectedService) || null;
    this.currentServiceLevel = this.currentOffering?.serviceLevels[0] || null;
    this.selectedServiceLevelId = this.currentServiceLevel?.id || '';
    this.selectedOptionIds = [];
    this.calculateQuote();
  }

  onServiceLevelChange(): void {
    if (!this.currentOffering) {
      this.currentServiceLevel = null;
      this.selectedServiceLevelId = '';
      this.calculateQuote();
      return;
    }

    this.currentServiceLevel =
      this.currentOffering.serviceLevels.find(level => level.id === this.selectedServiceLevelId) ||
      this.currentOffering.serviceLevels[0] ||
      null;
    this.selectedOptionIds = [];
    this.calculateQuote();
  }

  calculateQuote(): void {
    if (!this.currentOffering) {
      this.monthlyPrice = 0;
      this.totalPrice = 0;
      this.discountAmount = 0;
      return;
    }

    if (!this.currentServiceLevel) {
      this.monthlyPrice = 0;
      this.totalPrice = 0;
      this.discountAmount = 0;
      return;
    }

    // Calculate monthly cost based on pricing unit
    const baseMonthly = this.currentServiceLevel.basePrice * this.quantity;
    const professionalServices = (this.currentServiceLevel.professionalServicesPrice || 0) * this.quantity;
    const optionsMonthlyTotal = this.getOptionsMonthlyTotal();
    const optionsOneTimeTotal = this.getOptionsOneTimeTotal();
    let monthlyPrice = baseMonthly + professionalServices + optionsMonthlyTotal;

    // Calculate total for duration
    let totalWithDuration = monthlyPrice * this.durationMonths;

    // Apply discount if opted in and duration is 12 months or more
    // (Shown as "annual" for 12-23 months, "multi-year" for 24+ months)
    if (this.showAnnualDiscount && this.durationMonths >= 12) {
      this.discountAmount = totalWithDuration * (this.annualDiscount / 100);
      totalWithDuration -= this.discountAmount;
    } else {
      this.discountAmount = 0;
    }

    // Add setup fee
    const total = totalWithDuration + optionsOneTimeTotal + (this.showSetupFee ? this.currentOffering.setupFee : 0);
    
    this.monthlyPrice = monthlyPrice;
    this.totalPrice = total;
  }

  toggleSetupFee(): void {
    this.showSetupFee = !this.showSetupFee;
    this.calculateQuote();
  }

  isOptionSelected(optionId: string): boolean {
    return this.selectedOptionIds.includes(optionId);
  }

  toggleOption(optionId: string, checked: boolean): void {
    if (checked && !this.selectedOptionIds.includes(optionId)) {
      this.selectedOptionIds = [...this.selectedOptionIds, optionId];
    } else if (!checked) {
      this.selectedOptionIds = this.selectedOptionIds.filter(id => id !== optionId);
    }
    this.calculateQuote();
  }

  getSelectedOptions(): MSPOption[] {
    if (!this.currentServiceLevel) return [];
    return this.currentServiceLevel.options.filter(option => this.selectedOptionIds.includes(option.id));
  }

  getOptionsMonthlyTotal(): number {
    const selected = this.getSelectedOptions();
    return selected.reduce((total, option) => {
      if (option.pricingUnit === 'one-time') {
        return total;
      }
      return total + option.monthlyPrice * this.quantity;
    }, 0);
  }

  getOptionsOneTimeTotal(): number {
    const selected = this.getSelectedOptions();
    return selected.reduce((total, option) => {
      if (option.pricingUnit !== 'one-time') {
        return total;
      }
      return total + option.monthlyPrice;
    }, 0);
  }

  getPricingUnitLabel(unit?: PricingUnit): string {
    const match = this.getPricingUnitOption(unit);
    return match?.suffix || '/unit/mo';
  }

  getPricingUnitName(unit?: PricingUnit): string {
    const match = this.getPricingUnitOption(unit);
    if (!match) return 'unit';
    return match.label;
  }

  getPricingUnitDisplayName(): string {
    const match = this.getPricingUnitOption();
    return match?.label || 'Units';
  }

  getPerUnitTotal(): number {
    if (!this.currentServiceLevel) return 0;
    const basePerUnit = this.currentServiceLevel.basePrice || 0;
    const professionalServicesPerUnit = this.currentServiceLevel.professionalServicesPrice || 0;
    const selectedOptions = this.getSelectedOptions();
    const optionsPerUnit = selectedOptions.reduce((total, option) => {
      if (option.pricingUnit === 'one-time') {
        return total;
      }
      return total + option.monthlyPrice;
    }, 0);
    return basePerUnit + professionalServicesPerUnit + optionsPerUnit;
  }

  getAddOnPerUnitTotal(): number {
    const selectedOptions = this.getSelectedOptions();
    return selectedOptions.reduce((total, option) => {
      if (option.pricingUnit === 'one-time') {
        return total;
      }
      return total + option.monthlyPrice;
    }, 0);
  }

  private getPricingUnitOption(unit?: PricingUnit): PricingUnitOption | null {
    const target = unit || this.currentServiceLevel?.pricingUnit;
    if (!target) return null;
    return this.pricingUnits.find(option => option.value === target) || null;
  }

  generateQuote(): void {
    const selectedCustomer = this.customers.find(customer => customer.id === this.selectedCustomerId);

    if (!selectedCustomer) {
      alert('Please select a customer');
      return;
    }

    if (!this.currentOffering || !this.currentServiceLevel) {
      alert('Please select a valid service');
      return;
    }

    const now = new Date();
    const createdDate = now.toLocaleDateString();
    const createdTime = now.toLocaleTimeString();
    const basePricePerUnit = this.currentServiceLevel.basePrice || 0;
    const professionalServicesPerUnit = this.currentServiceLevel.professionalServicesPrice || 0;
    const professionalServicesTotal = professionalServicesPerUnit * this.quantity;
    const selectedOptions = this.getSelectedOptions();
    const addOnMonthlyTotal = this.getOptionsMonthlyTotal();
    const addOnOneTimeTotal = this.getOptionsOneTimeTotal();
    const addOnPerUnitTotal = selectedOptions.reduce((total, option) => {
      if (option.pricingUnit === 'one-time') {
        return total;
      }
      return total + option.monthlyPrice;
    }, 0);
    const perUnitTotal = basePricePerUnit + professionalServicesPerUnit + addOnPerUnitTotal;

    const quoteData: Omit<Quote, 'id' | 'Id'> = {
      type: 'msp',
      customerName: selectedCustomer.name || '',
      notes: '',
      service: this.selectedService,
      serviceLevelName: this.currentServiceLevel.name,
      pricingUnitLabel: this.getPricingUnitLabel(),
      basePricePerUnit,
      professionalServicesPrice: professionalServicesPerUnit,
      professionalServicesTotal,
      perUnitTotal,
      selectedOptions: selectedOptions.map(option => ({
        id: option.id,
        name: option.name,
        monthlyPrice: option.monthlyPrice,
        pricingUnit: option.pricingUnit
      })),
      addOnMonthlyTotal,
      addOnOneTimeTotal,
      addOnPerUnitTotal,
      numberOfUsers: this.quantity,
      durationMonths: this.durationMonths,
      monthlyPrice: this.monthlyPrice,
      totalPrice: this.totalPrice,
      setupFee: this.showSetupFee ? this.currentOffering.setupFee : 0,
      discountAmount: this.discountAmount,
      annualDiscountApplied: this.showAnnualDiscount && this.durationMonths >= 12,
      status: 'pending',
      createdDate,
      createdTime,
    };

    console.log('[MspQuoteComponent] Generating and saving quote:', quoteData);
    
    this.quoteService.createQuote(quoteData)
      .subscribe({
        next: (response) => {
          console.log('[MspQuoteComponent] Quote saved successfully:', response);
          const quoteId = response.data?.id || response.data?.Id;
          alert(`Quote generated and saved successfully!\nQuote ID: ${quoteId}\nTotal: $${this.totalPrice.toFixed(2)}`);
          // Optionally navigate to quote view or refresh list
          setTimeout(() => {
            this.quoteService.refreshQuotes();
          }, 500);
        },
        error: (error) => {
          console.error('[MspQuoteComponent] Error saving quote:', error);
          alert(`Failed to save quote: ${error?.error?.message || 'Unknown error'}`);
        }
      });
  }
}
