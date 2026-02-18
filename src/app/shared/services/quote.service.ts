import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Quote {
  id: string;
  type: 'msp' | 'labor';
  customerName: string;
  notes?: string;
  service: string;
  serviceLevelName?: string;
  pricingUnitLabel?: string;
  basePricePerUnit?: number;
  professionalServicesPrice?: number;
  professionalServicesTotal?: number;
  perUnitTotal?: number;
  selectedOptions?: Array<{
    id: string;
    name: string;
    monthlyPrice: number;
    pricingUnit: string;
  }>;
  addOnMonthlyTotal?: number;
  addOnOneTimeTotal?: number;
  addOnPerUnitTotal?: number;
  workItems?: Array<{
    name: string;
    referenceArchitecture?: string;
    section?: string;
    unitOfMeasure?: string;
    solutionName?: string;
    closetCount: number;
    switchCount: number;
    hoursPerSwitch: number;
    ratePerHour: number;
    lineHours: number;
    lineTotal: number;
  }>;
  laborGroups?: Array<{
    section: string;
    total: number;
    items: number;
  }>;
  totalHours?: number;
  numberOfUsers: number;
  durationMonths: number;
  monthlyPrice: number;
  totalPrice: number;
  setupFee: number;
  discountAmount: number;
  status: 'pending' | 'approved' | 'denied';
  createdDate: string;
  createdTime: string;
}

@Injectable({
  providedIn: 'root'
})
export class QuoteService {
  private readonly STORAGE_KEY = 'msp_quotes';
  private quotesSubject = new BehaviorSubject<Quote[]>(this.loadQuotes());

  public quotes$ = this.quotesSubject.asObservable();

  constructor() {}

  private loadQuotes(): Quote[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? this.normalizeQuotes(JSON.parse(stored) as Quote[]) : [];
  }

  private normalizeQuotes(quotes: Quote[]): Quote[] {
    return (quotes || []).map(quote => ({
      ...quote,
      type: quote.type || 'msp',
      notes: quote.notes || ''
    }));
  }

  private saveQuotes(quotes: Quote[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(quotes));
    this.quotesSubject.next(quotes);
  }

  generateQuoteId(): string {
    return 'QUOTE-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  createQuote(quote: Omit<Quote, 'id'>): Quote {
    const newQuote: Quote = {
      ...quote,
      id: this.generateQuoteId(),
    };

    const quotes = this.quotesSubject.value;
    quotes.push(newQuote);
    this.saveQuotes(quotes);

    return newQuote;
  }

  getQuotes(): Quote[] {
    return this.quotesSubject.value;
  }

  getQuoteById(id: string): Quote | undefined {
    return this.quotesSubject.value.find(q => q.id === id);
  }

  updateQuoteStatus(id: string, status: 'approved' | 'denied'): void {
    const quotes = this.quotesSubject.value;
    const quote = quotes.find(q => q.id === id);
    
    if (quote) {
      quote.status = status;
      this.saveQuotes(quotes);
    }
  }

  updateQuote(id: string, updates: Partial<Quote>): void {
    const quotes = this.quotesSubject.value;
    const index = quotes.findIndex(q => q.id === id);
    if (index === -1) return;
    quotes[index] = { ...quotes[index], ...updates };
    this.saveQuotes(quotes);
  }

  deleteQuote(id: string): void {
    const quotes = this.quotesSubject.value.filter(q => q.id !== id);
    this.saveQuotes(quotes);
  }

  getPendingQuotes(): Quote[] {
    return this.quotesSubject.value.filter(q => q.status === 'pending');
  }

  getApprovedQuotes(): Quote[] {
    return this.quotesSubject.value.filter(q => q.status === 'approved');
  }

  getDeniedQuotes(): Quote[] {
    return this.quotesSubject.value.filter(q => q.status === 'denied');
  }
}
