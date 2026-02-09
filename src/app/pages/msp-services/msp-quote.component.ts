import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { QuoteService, Quote } from '../../shared/services/quote.service';
import { MSPOfferingsService, MSPOffering, MSPServiceLevel, PricingUnit } from '../../shared/services/msp-offerings.service';
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
  customerName: string = '';
  quantity: number = 10;
  durationMonths: number = 12;
  selectedService: string = '';
  selectedServiceLevelId: string = '';

  // Offerings and pricing
  offerings: MSPOffering[] = [];
  currentOffering: MSPOffering | null = null;
  currentServiceLevel: MSPServiceLevel | null = null;
  services: string[] = [];

  // Configuration
  showSetupFee: boolean = true;
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
    private router: Router
  ) {}

  ngOnInit(): void {
    // Load offerings
    this.subscription.add(
      this.offeringsService.getOfferings().subscribe(offerings => {
        this.offerings = offerings.filter(o => o.isActive);
        this.services = this.offerings.map(o => o.name);
        
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
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  onServiceChange(): void {
    this.currentOffering = this.offerings.find(o => o.name === this.selectedService) || null;
    this.currentServiceLevel = this.currentOffering?.serviceLevels[0] || null;
    this.selectedServiceLevelId = this.currentServiceLevel?.id || '';
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
    let monthlyPrice = this.currentServiceLevel.basePrice * this.quantity;

    // Calculate total for duration
    let totalWithDuration = monthlyPrice * this.durationMonths;

    // Apply annual discount if duration is 12 months or more
    if (this.durationMonths >= 12) {
      this.discountAmount = totalWithDuration * (this.annualDiscount / 100);
      totalWithDuration -= this.discountAmount;
    } else {
      this.discountAmount = 0;
    }

    // Add setup fee
    const total = totalWithDuration + (this.showSetupFee ? this.currentOffering.setupFee : 0);
    
    this.monthlyPrice = monthlyPrice;
    this.totalPrice = total;
  }

  toggleSetupFee(): void {
    this.showSetupFee = !this.showSetupFee;
    this.calculateQuote();
  }

  getPricingUnitLabel(unit?: PricingUnit): string {
    const labels: { [key in PricingUnit]: string } = {
      'per-user': '/user/mo',
      'per-gb': '/GB/mo',
      'per-device': '/device/mo',
      'one-time': '/one-time'
    };

    if (unit) {
      return labels[unit];
    }

    if (!this.currentServiceLevel) return '/unit/mo';
    return labels[this.currentServiceLevel.pricingUnit];
  }

  getPricingUnitName(unit?: PricingUnit): string {
    const labels: { [key in PricingUnit]: string } = {
      'per-user': 'user',
      'per-gb': 'GB',
      'per-device': 'device',
      'one-time': 'one-time'
    };

    if (unit) {
      return labels[unit];
    }

    if (!this.currentServiceLevel) return 'unit';
    return labels[this.currentServiceLevel.pricingUnit];
  }

  getPricingUnitDisplayName(): string {
    if (!this.currentServiceLevel) return 'Units';
    
    const labels: { [key in PricingUnit]: string } = {
      'per-user': 'Users',
      'per-gb': 'GB Storage',
      'per-device': 'Devices',
      'one-time': 'Units'
    };
    return labels[this.currentServiceLevel.pricingUnit];
  }

  generateQuote(): void {
    if (!this.customerName.trim()) {
      alert('Please enter a customer name');
      return;
    }

    if (!this.currentOffering || !this.currentServiceLevel) {
      alert('Please select a valid service');
      return;
    }

    const now = new Date();
    const createdDate = now.toLocaleDateString();
    const createdTime = now.toLocaleTimeString();

    const quoteData: Omit<Quote, 'id'> = {
      type: 'msp',
      customerName: this.customerName,
      notes: '',
      service: this.selectedService,
      serviceLevelName: this.currentServiceLevel.name,
      numberOfUsers: this.quantity,
      durationMonths: this.durationMonths,
      monthlyPrice: this.monthlyPrice,
      totalPrice: this.totalPrice,
      setupFee: this.showSetupFee ? this.currentOffering.setupFee : 0,
      discountAmount: this.discountAmount,
      status: 'pending',
      createdDate,
      createdTime,
    };

    const savedQuote = this.quoteService.createQuote(quoteData);
    
    alert(`Quote generated successfully! Quote ID: ${savedQuote.id}\nTotal: $${this.totalPrice.toFixed(2)}`);
  }
}
