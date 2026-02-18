import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError } from 'rxjs';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MSPOption {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  monthlyCost?: number;
  marginPercent?: number;
  pricingUnit: PricingUnit;
}

export interface MSPServiceLevel {
  id: string;
  name: string;
  basePrice: number;
  baseCost?: number;
  marginPercent?: number;
  licenseCost?: number;
  licenseMargin?: number;
  professionalServicesPrice?: number;
  professionalServicesCost?: number;
  professionalServicesMargin?: number;
  pricingUnit: PricingUnit;
  options: MSPOption[];
}

export type PricingUnit = 'per-user' | 'per-gb' | 'per-device' | 'one-time';

export interface MSPOffering {
  id?: string;
  Id?: string;
  name?: string;
  Name?: string;
  description?: string;
  Description?: string;
  imageUrl?: string;
  ImageUrl?: string;
  category?: 'backup' | 'support' | 'database' | 'consulting';
  Category?: 'backup' | 'support' | 'database' | 'consulting';
  basePrice?: number;
  BasePrice?: number;
  pricingUnit?: PricingUnit;
  PricingUnit?: PricingUnit;
  setupFee: number;
  SetupFee?: number;
  setupFeeCost?: number;
  SetupFeeCost?: number;
  setupFeeMargin?: number;
  SetupFeeMargin?: number;
  features: string[];
  options?: MSPOption[];
  serviceLevels: MSPServiceLevel[];
  isActive: boolean;
  IsActive?: boolean;
  createdDate: string;
  CreatedDate?: string;
  lastModified: string;
  LastModified?: string;
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
export class MSPOfferingsService {
  private offeringsSubject = new BehaviorSubject<MSPOffering[]>([]);
  public offerings$ = this.offeringsSubject.asObservable();
  
  private apiUrl = `${environment.apiUrl}/msp-offerings`;

  constructor(private http: HttpClient) {
    this.loadOfferingsFromApi();
  }

  /**
   * Load all offerings from backend API
   */
  private loadOfferingsFromApi(): void {
    console.log('[MSPOfferingService] Loading offerings from API...');
    this.http.get<ApiResponse<MSPOffering[]>>(this.apiUrl)
      .pipe(
        tap(response => {
          console.log('[MSPOfferingService] API Response:', response);
          if (response.success && Array.isArray(response.data)) {
            const normalized = response.data.map(o => this.normalizeOffering(o));
            console.log('[MSPOfferingService] Normalized offerings:', normalized);
            this.offeringsSubject.next(normalized);
          } else {
            console.warn('[MSPOfferingService] Unexpected response format:', response);
            this.offeringsSubject.next([]);
          }
        }),
        catchError(error => {
          console.error('[MSPOfferingService] Failed to load offerings from API:', error);
          this.offeringsSubject.next([]);
          return of(null);
        })
      )
      .subscribe({
        next: () => console.log('[MSPOfferingService] Load offerings: Complete'),
        error: (err) => console.error('[MSPOfferingService] Subscribe error:', err)
      });
  }

  /**
   * Normalize offering object to consistent field names
   */
  private normalizeOffering(offering: MSPOffering): MSPOffering {
    const serviceLevels = ((offering.serviceLevels || (offering as any).ServiceLevels) ?? []).map(level => {
      const lvl = level as any;
      return {
        id: level.id || lvl.Id,
        name: level.name || lvl.Name,
        basePrice: (level.basePrice || lvl.BasePrice) ?? 0,
        baseCost: level.baseCost || lvl.BaseCost,
        marginPercent: level.marginPercent || lvl.MarginPercent,
        licenseCost: (level.licenseCost || lvl.LicenseCost) ?? (level.baseCost ?? lvl.BaseCost ?? level.basePrice ?? lvl.BasePrice ?? 0),
        licenseMargin: (level.licenseMargin || lvl.LicenseMargin) ?? (level.marginPercent ?? lvl.MarginPercent ?? 0),
        professionalServicesPrice: (level.professionalServicesPrice || lvl.ProfessionalServicesPrice) ?? 0,
        professionalServicesCost: (level.professionalServicesCost || lvl.ProfessionalServicesCost) ?? 0,
        professionalServicesMargin: (level.professionalServicesMargin || lvl.ProfessionalServicesMargin) ?? 0,
        pricingUnit: (level.pricingUnit || lvl.PricingUnit || 'per-user') as PricingUnit,
        options: ((level.options || lvl.Options) ?? []).map(option => {
          const opt = option as any;
          return {
            id: option.id || opt.Id,
            name: option.name || opt.Name,
            description: option.description || opt.Description,
            monthlyPrice: (option.monthlyPrice || opt.MonthlyPrice) ?? 0,
            monthlyCost: (option.monthlyCost || opt.MonthlyCost) ?? (option.monthlyPrice ?? opt.MonthlyPrice ?? 0),
            marginPercent: (option.marginPercent || opt.MarginPercent) ?? 0,
            pricingUnit: (option.pricingUnit || opt.PricingUnit || 'per-user') as PricingUnit
          };
        })
      };
    });

    return {
      id: offering.id || offering.Id,
      name: offering.name || offering.Name,
      description: offering.description || offering.Description,
      imageUrl: offering.imageUrl || offering.ImageUrl,
      category: (offering.category || offering.Category) as any,
      basePrice: offering.basePrice || offering.BasePrice,
      pricingUnit: (offering.pricingUnit || offering.PricingUnit) as any,
      setupFee: offering.setupFee ?? offering.SetupFee ?? 0,
      setupFeeCost: offering.setupFeeCost ?? offering.SetupFeeCost,
      setupFeeMargin: offering.setupFeeMargin ?? offering.SetupFeeMargin,
      features: (offering.features || (offering as any).Features) ?? [],
      serviceLevels: serviceLevels,
      isActive: (offering.isActive ?? offering.IsActive) !== false,
      createdDate: offering.createdDate || offering.CreatedDate || new Date().toLocaleDateString(),
      lastModified: offering.lastModified || offering.LastModified || new Date().toLocaleDateString(),
    };
  }

  /**
   * Get current offerings from local state
   */
  getOfferings(): Observable<MSPOffering[]> {
    return this.offerings$;
  }

  /**
   * Get offering by ID
   */
  getOfferingById(id: string): MSPOffering | undefined {
    return this.offeringsSubject.value.find(o => (o.id || o.Id) === id);
  }

  /**
   * Get offering by ID from API (for edit form to get latest data with features/serviceLevels)
   */
  getOfferingByIdFromApi(id: string): Observable<ApiResponse<MSPOffering>> {
    return this.http.get<ApiResponse<MSPOffering>>(`${this.apiUrl}/${id}`);
  }

  /**
   * Create new offering on backend
   */
  createOffering(offering: Omit<MSPOffering, 'id' | 'createdDate' | 'lastModified'>): Observable<ApiResponse<MSPOffering>> {
    const payload = {
      Name: offering.name || offering.Name,
      Description: offering.description || offering.Description,
      ImageUrl: offering.imageUrl || offering.ImageUrl,
      Category: offering.category || offering.Category,
      BasePrice: offering.basePrice || offering.BasePrice,
      PricingUnit: offering.pricingUnit || offering.PricingUnit || 'per-user',
      SetupFee: offering.setupFee ?? offering.SetupFee ?? 0,
      SetupFeeCost: offering.setupFeeCost ?? offering.SetupFeeCost,
      SetupFeeMargin: offering.setupFeeMargin ?? offering.SetupFeeMargin,
      IsActive: (offering.isActive ?? offering.IsActive) !== false,
      Features: offering.features || (offering as any).Features || [],
      ServiceLevels: offering.serviceLevels || (offering as any).ServiceLevels || []
    };

    console.log('[MSPOfferingService] Creating offering:', payload);
    return this.http.post<ApiResponse<MSPOffering>>(this.apiUrl, payload)
      .pipe(
        tap(response => {
          console.log('[MSPOfferingService] Create response:', response);
          if (response.success && response.data) {
            const normalized = this.normalizeOffering(response.data);
            const current = this.offeringsSubject.value;
            this.offeringsSubject.next([...current, normalized]);
            console.log('[MSPOfferingService] Offering created successfully:', normalized);
          }
        }),
        catchError(error => {
          console.error('[MSPOfferingService] Failed to create offering:', error);
          throw error;
        })
      );
  }

  /**
   * Update offering on backend
   */
  updateOffering(id: string, updates: Partial<MSPOffering>): Observable<ApiResponse<MSPOffering>> {
    const offeringId = id || updates.id || updates.Id;
    const payload: any = {};

    if (updates.name) payload.Name = updates.name;
    if (updates.Name) payload.Name = updates.Name;
    if (updates.description) payload.Description = updates.description;
    if (updates.Description) payload.Description = updates.Description;
    if (updates.imageUrl) payload.ImageUrl = updates.imageUrl;
    if (updates.ImageUrl) payload.ImageUrl = updates.ImageUrl;
    if (updates.category) payload.Category = updates.category;
    if (updates.Category) payload.Category = updates.Category;
    if (updates.basePrice !== undefined) payload.BasePrice = updates.basePrice;
    if (updates.BasePrice !== undefined) payload.BasePrice = updates.BasePrice;
    if (updates.pricingUnit) payload.PricingUnit = updates.pricingUnit;
    if (updates.PricingUnit) payload.PricingUnit = updates.PricingUnit;
    if (updates.setupFee !== undefined) payload.SetupFee = updates.setupFee;
    if (updates.SetupFee !== undefined) payload.SetupFee = updates.SetupFee;
    if (updates.setupFeeCost !== undefined) payload.SetupFeeCost = updates.setupFeeCost;
    if (updates.SetupFeeCost !== undefined) payload.SetupFeeCost = updates.SetupFeeCost;
    if (updates.setupFeeMargin !== undefined) payload.SetupFeeMargin = updates.setupFeeMargin;
    if (updates.SetupFeeMargin !== undefined) payload.SetupFeeMargin = updates.SetupFeeMargin;
    if (updates.isActive !== undefined) payload.IsActive = updates.isActive;
    if (updates.IsActive !== undefined) payload.IsActive = updates.IsActive;
    if (updates.features) payload.Features = updates.features;
    if (updates.serviceLevels) {
      // Sanitize service levels to only send camelCase properties.
      // The loadOffering spread used to copy PascalCase props which then
      // took priority in the backend's PascalCase-first extraction logic.
      payload.ServiceLevels = updates.serviceLevels.map(sl => ({
        id: sl.id,
        name: sl.name,
        basePrice: sl.basePrice ?? 0,
        baseCost: sl.baseCost ?? 0,
        marginPercent: sl.marginPercent ?? 0,
        licenseCost: sl.licenseCost ?? 0,
        licenseMargin: sl.licenseMargin ?? 0,
        professionalServicesPrice: sl.professionalServicesPrice ?? 0,
        professionalServicesCost: sl.professionalServicesCost ?? 0,
        professionalServicesMargin: sl.professionalServicesMargin ?? 0,
        pricingUnit: sl.pricingUnit || 'per-user',
        options: (sl.options || []).map(opt => ({
          id: opt.id,
          name: opt.name,
          description: opt.description || '',
          monthlyPrice: opt.monthlyPrice ?? 0,
          monthlyCost: opt.monthlyCost ?? 0,
          marginPercent: opt.marginPercent ?? 0,
          pricingUnit: opt.pricingUnit || 'per-user'
        }))
      }));
    }

    console.log('[MSPOfferingService] Updating offering:', offeringId);
    console.log('[MSPOfferingService] Payload being sent:', JSON.stringify(payload, null, 2));
    return this.http.put<ApiResponse<MSPOffering>>(`${this.apiUrl}/${offeringId}`, payload)
      .pipe(
        tap(response => {
          console.log('[MSPOfferingService] Update response:', response);
          if (response.success) {
            const current = this.offeringsSubject.value;
            const index = current.findIndex(o => (o.id || o.Id) === offeringId);
            if (index !== -1) {
              current[index] = { ...current[index], ...updates };
              this.offeringsSubject.next([...current]);
            }
          }
        }),
        catchError(error => {
          console.error('[MSPOfferingService] Failed to update offering:', error);
          throw error;
        })
      );
  }

  /**
   * Delete offering from backend
   */
  deleteOffering(id: string): void {
    console.log('[MSPOfferingService] Deleting offering:', id);
    this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`)
      .pipe(
        tap(response => {
          console.log('[MSPOfferingService] Delete response:', response);
          if (response.success) {
            const current = this.offeringsSubject.value;
            const filtered = current.filter(o => (o.id || o.Id) !== id);
            this.offeringsSubject.next(filtered);
            console.log('[MSPOfferingService] Offering deleted successfully');
          }
        }),
        catchError(error => {
          console.error('[MSPOfferingService] Failed to delete offering:', error);
          return of(null);
        })
      )
      .subscribe({
        error: (err) => console.error('[MSPOfferingService] Delete subscribe error:', err)
      });
  }

  /**
   * Toggle offering status between active and inactive
   */
  toggleOfferingStatus(id: string): void {
    const offering = this.getOfferingById(id);
    if (!offering) return;

    console.log('[MSPOfferingService] Toggling status for offering:', id);
    this.http.post<ApiResponse<MSPOffering>>(`${this.apiUrl}/${id}/toggle-status`, {})
      .pipe(
        tap(response => {
          console.log('[MSPOfferingService] Toggle response:', response);
          if (response.success) {
            const current = this.offeringsSubject.value;
            const index = current.findIndex(o => (o.id || o.Id) === id);
            if (index !== -1) {
              current[index].isActive = !current[index].isActive;
              this.offeringsSubject.next([...current]);
            }
          }
        }),
        catchError(error => {
          console.error('[MSPOfferingService] Failed to toggle status:', error);
          return of(null);
        })
      )
      .subscribe({
        error: (err) => console.error('[MSPOfferingService] Toggle subscribe error:', err)
      });
  }

  /**
   * Get offerings by category
   */
  getOfferingsByCategory(category: string): MSPOffering[] {
    return this.offeringsSubject.value.filter(o => (o.category || o.Category) === category);
  }

  /**
   * Refresh offerings from API
   */
  refreshOfferings(): void {
    console.log('[MSPOfferingService] Refreshing offerings');
    this.loadOfferingsFromApi();
  }

  /**
   * Legacy method - add option (kept for backward compatibility)
   */
  addOption(offeringId: string, option: Omit<MSPOption, 'id'>): void {
    console.warn('[MSPOfferingService] addOption is not yet implemented for API backend');
  }

  /**
   * Legacy method - update option (kept for backward compatibility)
   */
  updateOption(offeringId: string, optionId: string, updates: Partial<MSPOption>): void {
    console.warn('[MSPOfferingService] updateOption is not yet implemented for API backend');
  }

  /**
   * Legacy method - delete option (kept for backward compatibility)
   */
  deleteOption(offeringId: string, optionId: string): void {
    console.warn('[MSPOfferingService] deleteOption is not yet implemented for API backend');
  }
}
