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
    groupName?: string;
    sortOrder?: number;
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
  createdBy?: string;
  createdByEmail?: string;
  CustomerId?: string;
  QuoteType?: string;
  Status?: 'pending' | 'approved' | 'denied' | 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  CreatedBy?: string;
  CreatedByEmail?: string;
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
   * Maps PascalCase database fields to camelCase frontend fields
   */
  private normalizeQuote(quote: any): Quote {
    return {
      id: quote.id || quote.Id,
      type: (quote.type || quote.QuoteType || 'msp') as any,
      customerName: quote.customerName || quote.CustomerName || '',
      notes: quote.notes || quote.Notes || '',
      service: quote.service || quote.ServiceName || '',
      serviceLevelName: quote.serviceLevelName || quote.ServiceLevelName,
      pricingUnitLabel: quote.pricingUnitLabel || quote.PricingUnitLabel,
      basePricePerUnit: quote.basePricePerUnit ?? quote.BasePricePerUnit,
      professionalServicesPrice: quote.professionalServicesPrice ?? quote.ProfessionalServicesPrice,
      professionalServicesTotal: quote.professionalServicesTotal ?? quote.ProfessionalServicesTotal,
      perUnitTotal: quote.perUnitTotal ?? quote.PerUnitTotal,
      selectedOptions: (quote.selectedOptions || []).map((opt: any) => ({
        id: opt.id || opt.Id || opt.OptionId || opt.optionId,
        name: opt.name || opt.Name,
        monthlyPrice: opt.monthlyPrice ?? opt.MonthlyPrice ?? 0,
        pricingUnit: opt.pricingUnit || opt.PricingUnit || 'per-user'
      })),
      addOnMonthlyTotal: quote.addOnMonthlyTotal ?? quote.AddOnMonthlyTotal,
      addOnOneTimeTotal: quote.addOnOneTimeTotal ?? quote.AddOnOneTimeTotal,
      addOnPerUnitTotal: quote.addOnPerUnitTotal ?? quote.AddOnPerUnitTotal,
      workItems: (quote.workItems || []).map((wi: any) => ({
        name: wi.name || wi.Name || '',
        referenceArchitecture: wi.referenceArchitecture || wi.ReferenceArchitecture || null,
        section: wi.section || wi.Section || null,
        unitOfMeasure: wi.unitOfMeasure || wi.UnitOfMeasure || null,
        solutionName: wi.solutionName || wi.SolutionName || null,
        closetCount: wi.closetCount ?? wi.ClosetCount ?? 0,
        switchCount: wi.switchCount ?? wi.SwitchCount ?? 0,
        hoursPerSwitch: wi.hoursPerSwitch ?? wi.HoursPerUnit ?? 0,
        ratePerHour: wi.ratePerHour ?? wi.RatePerHour ?? 0,
        lineHours: wi.lineHours ?? wi.LineHours ?? 0,
        lineTotal: wi.lineTotal ?? wi.LineTotal ?? 0,
        groupName: wi.groupName || wi.GroupName || 'Default',
        sortOrder: wi.sortOrder ?? wi.SortOrder ?? 0
      })),
      laborGroups: (quote.laborGroups || []).map((lg: any) => ({
        section: lg.section || lg.Section || '',
        total: lg.total ?? lg.Total ?? 0,
        items: lg.items ?? lg.ItemCount ?? 0
      })),
      totalHours: quote.totalHours ?? quote.TotalHours,
      numberOfUsers: quote.numberOfUsers || quote.NumberOfUsers || 1,
      durationMonths: quote.durationMonths || quote.DurationMonths || 1,
      monthlyPrice: quote.monthlyPrice ?? quote.MonthlyPrice ?? 0,
      totalPrice: quote.totalPrice ?? quote.TotalPrice ?? 0,
      setupFee: quote.setupFee ?? quote.SetupFee ?? 0,
      discountAmount: quote.discountAmount ?? quote.DiscountAmount ?? 0,
      annualDiscountApplied: quote.annualDiscountApplied ?? quote.AnnualDiscountApplied ?? false,
      status: ((quote.status || quote.Status || 'pending') as any),
      createdDate: quote.createdDate || quote.CreatedDate,
      createdTime: quote.createdTime || quote.CreatedTime,
      createdBy: quote.createdBy || quote.CreatedBy,
      createdByEmail: quote.createdByEmail || quote.CreatedByEmail
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
      ServiceLevelName: quote.serviceLevelName || null,
      PricingUnitLabel: quote.pricingUnitLabel || null,
      BasePricePerUnit: quote.basePricePerUnit ?? 0,
      ProfessionalServicesPrice: quote.professionalServicesPrice ?? 0,
      ProfessionalServicesTotal: quote.professionalServicesTotal ?? 0,
      PerUnitTotal: quote.perUnitTotal ?? 0,
      AddOnMonthlyTotal: quote.addOnMonthlyTotal ?? 0,
      AddOnOneTimeTotal: quote.addOnOneTimeTotal ?? 0,
      AddOnPerUnitTotal: quote.addOnPerUnitTotal ?? 0,
      NumberOfUsers: quote.numberOfUsers,
      DurationMonths: quote.durationMonths,
      MonthlyPrice: quote.monthlyPrice,
      TotalPrice: quote.totalPrice,
      SetupFee: quote.setupFee ?? 0,
      DiscountAmount: quote.discountAmount ?? 0,
      AnnualDiscountApplied: quote.annualDiscountApplied ?? false,
      TotalHours: quote.totalHours ?? 0,
      Status: quote.status || 'pending',
      CreatedDate: quote.createdDate || new Date().toLocaleDateString(),
      CreatedTime: quote.createdTime || new Date().toLocaleTimeString(),
      CreatedBy: quote.createdBy,
      CreatedByEmail: quote.createdByEmail,
      selectedOptions: quote.selectedOptions || [],
      workItems: quote.workItems || [],
      laborGroups: quote.laborGroups || []
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

    if (updates.customerName !== undefined) payload.CustomerName = updates.customerName;
    if (updates.notes !== undefined) payload.Notes = updates.notes;
    if (updates.service !== undefined) payload.ServiceName = updates.service;
    if (updates.serviceLevelName !== undefined) payload.ServiceLevelName = updates.serviceLevelName;
    if (updates.pricingUnitLabel !== undefined) payload.PricingUnitLabel = updates.pricingUnitLabel;
    if (updates.basePricePerUnit !== undefined) payload.BasePricePerUnit = updates.basePricePerUnit;
    if (updates.professionalServicesPrice !== undefined) payload.ProfessionalServicesPrice = updates.professionalServicesPrice;
    if (updates.professionalServicesTotal !== undefined) payload.ProfessionalServicesTotal = updates.professionalServicesTotal;
    if (updates.perUnitTotal !== undefined) payload.PerUnitTotal = updates.perUnitTotal;
    if (updates.addOnMonthlyTotal !== undefined) payload.AddOnMonthlyTotal = updates.addOnMonthlyTotal;
    if (updates.addOnOneTimeTotal !== undefined) payload.AddOnOneTimeTotal = updates.addOnOneTimeTotal;
    if (updates.addOnPerUnitTotal !== undefined) payload.AddOnPerUnitTotal = updates.addOnPerUnitTotal;
    if (updates.status !== undefined) payload.Status = updates.status;
    if (updates.numberOfUsers !== undefined) payload.NumberOfUsers = updates.numberOfUsers;
    if (updates.durationMonths !== undefined) payload.DurationMonths = updates.durationMonths;
    if (updates.monthlyPrice !== undefined) payload.MonthlyPrice = updates.monthlyPrice;
    if (updates.totalPrice !== undefined) payload.TotalPrice = updates.totalPrice;
    if (updates.setupFee !== undefined) payload.SetupFee = updates.setupFee;
    if (updates.discountAmount !== undefined) payload.DiscountAmount = updates.discountAmount;
    if (updates.annualDiscountApplied !== undefined) payload.AnnualDiscountApplied = updates.annualDiscountApplied;
    if (updates.totalHours !== undefined) payload.TotalHours = updates.totalHours;
    if (updates.selectedOptions !== undefined) payload.selectedOptions = updates.selectedOptions;
    if (updates.workItems !== undefined) payload.workItems = updates.workItems;
    if (updates.laborGroups !== undefined) payload.laborGroups = updates.laborGroups;

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
    // Map frontend status values to backend accepted values
    const statusMap: Record<string, 'accepted' | 'rejected'> = {
      'approved': 'accepted',
      'denied': 'rejected',
      'accepted': 'accepted',
      'rejected': 'rejected'
    };
    const mappedStatus = statusMap[status];
    return this.updateQuote(id, { status: mappedStatus });
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
   * Get approved quotes (checks both 'approved' and 'accepted' statuses)
   */
  getApprovedQuotes(): Quote[] {
    return this.quotesSubject.value.filter(q => 
      q.status === 'approved' || q.Status === 'approved' ||
      q.status === 'accepted' || q.Status === 'accepted'
    );
  }

  /**
   * Get denied quotes (checks both 'denied' and 'rejected' statuses)
   */
  getDeniedQuotes(): Quote[] {
    return this.quotesSubject.value.filter(q => 
      q.status === 'denied' || q.Status === 'denied' ||
      q.status === 'rejected' || q.Status === 'rejected'
    );
  }

  /**
   * Refresh quotes from API
   */
  refreshQuotes(): void {
    console.log('[QuoteService] Refreshing quotes');
    this.loadQuotesFromApi();
  }
}
