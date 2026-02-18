import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Quote {
  id?: string;
  Id?: string;
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
  annualDiscountApplied?: boolean;
  status: 'pending' | 'approved' | 'denied' | 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  createdDate?: string;
  createdTime?: string;
  CustomerId?: string;
  QuoteType?: string;
  Status?: 'pending' | 'approved' | 'denied' | 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  CreatedAt?: Date;
  UpdatedAt?: Date;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  statusCode: number;
}

@Injectable({
  providedIn: 'root'
})
export class QuoteService {
  private quotesSubject = new BehaviorSubject<Quote[]>([]);
  public quotes$ = this.quotesSubject.asObservable();
  private apiUrl = `${environment.apiUrl}/quotes`;

  constructor(private http: HttpClient) {
    this.loadQuotesFromApi();
  }

  /**
   * Load all quotes from backend API
   */
  private loadQuotesFromApi(): void {
    console.log('[QuoteService] Loading quotes from API...');
    this.http.get<ApiResponse<Quote[]>>(this.apiUrl)
      .pipe(
        tap(response => {
          console.log('[QuoteService] API Response:', response);
          if (response.success && Array.isArray(response.data)) {
            const normalized = response.data.map(q => this.normalizeQuote(q));
            this.quotesSubject.next(normalized);
          }
        }),
        catchError(error => {
          console.error('[QuoteService] Failed to load quotes from API:', error);
          this.quotesSubject.next([]);
          return of(null);
        })
      )
      .subscribe({
        error: (err) => console.error('[QuoteService] Subscribe error:', err)
      });
  }

  /**
   * Normalize quote object to consistent field names
   */
  private normalizeQuote(quote: Quote): Quote {
    return {
      id: quote.id || quote.Id,
      type: (quote.type as any) || 'msp',
      customerName: quote.customerName || '',
      notes: quote.notes || '',
      service: quote.service || '',
      serviceLevelName: quote.serviceLevelName,
      pricingUnitLabel: quote.pricingUnitLabel,
      basePricePerUnit: quote.basePricePerUnit,
      professionalServicesPrice: quote.professionalServicesPrice,
      professionalServicesTotal: quote.professionalServicesTotal,
      perUnitTotal: quote.perUnitTotal,
      selectedOptions: quote.selectedOptions || [],
      addOnMonthlyTotal: quote.addOnMonthlyTotal,
      addOnOneTimeTotal: quote.addOnOneTimeTotal,
      addOnPerUnitTotal: quote.addOnPerUnitTotal,
      workItems: quote.workItems || [],
      laborGroups: quote.laborGroups || [],
      totalHours: quote.totalHours,
      numberOfUsers: quote.numberOfUsers || 1,
      durationMonths: quote.durationMonths || 1,
      monthlyPrice: quote.monthlyPrice || 0,
      totalPrice: quote.totalPrice || 0,
      setupFee: quote.setupFee || 0,
      discountAmount: quote.discountAmount || 0,
      status: ((quote.status || quote.Status || 'pending') as any),
      createdDate: quote.createdDate,
      createdTime: quote.createdTime
    };
  }

  /**
   * Get current quotes from local state
   */
  getQuotes(): Quote[] {
    return this.quotesSubject.value;
  }

  /**
   * Get quote by ID
   */
  getQuoteById(id: string): Quote | undefined {
    return this.quotesSubject.value.find(q => (q.id === id || q.Id === id));
  }

  /**
   * Create new quote on backend
   */
  createQuote(quote: Omit<Quote, 'id' | 'Id'>): Observable<ApiResponse<Quote>> {
    const payload = {
      QuoteType: quote.type || 'msp',
      CustomerName: quote.customerName,
      Notes: quote.notes || '',
      ServiceName: quote.service,
      NumberOfUsers: quote.numberOfUsers,
      DurationMonths: quote.durationMonths,
      MonthlyPrice: quote.monthlyPrice,
      TotalPrice: quote.totalPrice,
      SetupFee: quote.setupFee,
      DiscountAmount: quote.discountAmount,
      Status: quote.status || 'draft'
    };

    console.log('[QuoteService] Creating quote:', payload);
    return this.http.post<ApiResponse<Quote>>(this.apiUrl, payload)
      .pipe(
        tap(response => {
          console.log('[QuoteService] Create response:', response);
          if (response.success && response.data) {
            const normalized = this.normalizeQuote(response.data);
            const current = this.quotesSubject.value;
            this.quotesSubject.next([...current, normalized]);
            console.log('[QuoteService] Quote created successfully:', normalized);
          }
        }),
        catchError(error => {
          console.error('[QuoteService] Failed to create quote:', error);
          throw error;
        })
      );
  }

  /**
   * Update quote on backend
   */
  updateQuote(id: string, updates: Partial<Quote>): Observable<ApiResponse<Quote>> {
    const quoteId = id || updates.id || updates.Id;
    const payload: any = {};

    if (updates.customerName) payload.CustomerName = updates.customerName;
    if (updates.notes) payload.Notes = updates.notes;
    if (updates.service) payload.ServiceName = updates.service;
    if (updates.status) payload.Status = updates.status;
    if (updates.numberOfUsers !== undefined) payload.NumberOfUsers = updates.numberOfUsers;
    if (updates.durationMonths !== undefined) payload.DurationMonths = updates.durationMonths;
    if (updates.monthlyPrice !== undefined) payload.MonthlyPrice = updates.monthlyPrice;
    if (updates.totalPrice !== undefined) payload.TotalPrice = updates.totalPrice;
    if (updates.setupFee !== undefined) payload.SetupFee = updates.setupFee;
    if (updates.discountAmount !== undefined) payload.DiscountAmount = updates.discountAmount;

    console.log('[QuoteService] Updating quote:', quoteId, payload);
    return this.http.put<ApiResponse<Quote>>(`${this.apiUrl}/${quoteId}`, payload)
      .pipe(
        tap(response => {
          console.log('[QuoteService] Update response:', response);
          if (response.success) {
            const current = this.quotesSubject.value;
            const index = current.findIndex(q => (q.id || q.Id) === quoteId);
            if (index !== -1) {
              current[index] = { ...current[index], ...updates };
              this.quotesSubject.next([...current]);
            }
          }
        }),
        catchError(error => {
          console.error('[QuoteService] Failed to update quote:', error);
          throw error;
        })
      );
  }

  /**
   * Update quote status
   */
  updateQuoteStatus(id: string, status: 'approved' | 'denied' | 'accepted' | 'rejected'): Observable<ApiResponse<Quote>> {
    return this.updateQuote(id, { status });
  }

  /**
   * Delete quote
   */
  deleteQuote(id: string): Observable<ApiResponse<any>> {
    console.log('[QuoteService] Deleting quote:', id);
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`)
      .pipe(
        tap(response => {
          console.log('[QuoteService] Delete response:', response);
          if (response.success) {
            const current = this.quotesSubject.value;
            const filtered = current.filter(q => (q.id || q.Id) !== id);
            this.quotesSubject.next(filtered);
            console.log('[QuoteService] Quote deleted successfully');
          }
        }),
        catchError(error => {
          console.error('[QuoteService] Failed to delete quote:', error);
          throw error;
        })
      );
  }

  /**
   * Get pending quotes
   */
  getPendingQuotes(): Quote[] {
    return this.quotesSubject.value.filter(q => (q.status === 'pending' || q.Status === 'pending'));
  }

  /**
   * Get approved quotes
   */
  getApprovedQuotes(): Quote[] {
    return this.quotesSubject.value.filter(q => (q.status === 'approved' || q.Status === 'approved'));
  }

  /**
   * Get denied quotes
   */
  getDeniedQuotes(): Quote[] {
    return this.quotesSubject.value.filter(q => (q.status === 'denied' || q.Status === 'denied'));
  }

  /**
   * Refresh quotes from API
   */
  refreshQuotes(): void {
    console.log('[QuoteService] Refreshing quotes');
    this.loadQuotesFromApi();
  }
}
