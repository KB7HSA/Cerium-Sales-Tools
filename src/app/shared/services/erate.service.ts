import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, of, map } from 'rxjs';
import { environment } from '../../../environments/environment';

// ================================================================
// INTERFACES
// ================================================================

export interface Form470Record {
  // Internal fields
  Id?: string;
  PrimaryKey: string;
  FirstSeenAt?: Date;
  LastSeenAt?: Date;
  LastRefreshId?: string;
  UserStatus?: string; // User-defined status: Bypassed, Responded, In Process, etc.
  IsNew?: boolean; // Transient UI field - true if this record is new since last refresh
  
  // Form identification
  ApplicationNumber?: string;
  FormNickname?: string;
  FormPdf?: string; // JSON string with url
  ServiceRequestId?: string;
  ServiceRequestRfpAttachment?: string;
  RfpDocuments?: string; // JSON string with url
  RfpUploadDate?: string;
  FormVersion?: string;
  FundingYear?: string;
  Fcc470Status?: string;
  AllowableContractDate?: string;
  CertifiedDateTime?: string;
  LastModifiedDateTime?: string;
  
  // Billed Entity info
  BilledEntityNumber?: string;
  BilledEntityName?: string;
  ApplicantType?: string;
  WebsiteUrl?: string;
  BenFccRegistrationNumber?: string;
  BenAddress1?: string;
  BenAddress2?: string;
  BilledEntityCity?: string;
  BilledEntityState?: string;
  BilledEntityZip?: string;
  BilledEntityZipExt?: string;
  BilledEntityEmail?: string;
  BilledEntityPhone?: string;
  BilledEntityPhoneExt?: string;
  NumberOfEligibleEntities?: number;
  
  // Contact info
  ContactName?: string;
  ContactAddress1?: string;
  ContactAddress2?: string;
  ContactCity?: string;
  ContactState?: string;
  ContactZip?: string;
  ContactZipExt?: string;
  ContactPhone?: string;
  ContactPhoneExt?: string;
  ContactEmail?: string;
  
  // Technical Contact
  TechnicalContactName?: string;
  TechnicalContactTitle?: string;
  TechnicalContactPhone?: string;
  TechnicalContactPhoneExt?: string;
  TechnicalContactEmail?: string;
  
  // Authorized Person
  AuthorizedPersonName?: string;
  AuthorizedPersonAddress?: string;
  AuthorizedPersonCity?: string;
  AuthorizedPersonState?: string;
  AuthorizedPersonZip?: string;
  AuthorizedPersonZipExt?: string;
  AuthorizedPersonPhone?: string;
  AuthorizedPersonPhoneExt?: string;
  AuthorizedPersonEmail?: string;
  AuthorizedPersonTitle?: string;
  AuthorizedPersonEmployer?: string;
  
  // Service details
  ServiceCategory?: string;
  ServiceType?: string;
  Function?: string;
  Manufacturer?: string;
  OtherManufacturer?: string;
  Entities?: string;
  Quantity?: string;
  Unit?: string;
  MinimumCapacity?: string;
  MaximumCapacity?: string;
}

export interface RefreshResult {
  refreshId: string;
  totalFetched: number;
  totalNew: number;
  totalUpdated: number;
  newKeys: string[];
  error?: string;
}

export interface RefreshHistory {
  Id: string;
  RefreshStartedAt: Date;
  RefreshCompletedAt?: Date;
  Status: string;
  TotalFetched?: number;
  TotalNew?: number;
  TotalUpdated?: number;
  ErrorMessage?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  statusCode?: number;
}

// ================================================================
// E-RATE SERVICE
// ================================================================

@Injectable({
  providedIn: 'root'
})
export class ERateService {
  private apiUrl = environment.apiUrl;
  
  // Form 470 records
  private recordsSubject = new BehaviorSubject<Form470Record[]>([]);
  public records$ = this.recordsSubject.asObservable();
  
  // Loading state
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();
  
  // Download in progress
  private downloadingSubject = new BehaviorSubject<boolean>(false);
  public downloading$ = this.downloadingSubject.asObservable();
  
  // Last refresh info
  private lastRefreshSubject = new BehaviorSubject<RefreshHistory | null>(null);
  public lastRefresh$ = this.lastRefreshSubject.asObservable();
  
  // Error state
  private errorSubject = new BehaviorSubject<string | null>(null);
  public error$ = this.errorSubject.asObservable();
  
  // New record keys from latest download (for highlighting)
  private newKeysSubject = new BehaviorSubject<Set<string>>(new Set());
  public newKeys$ = this.newKeysSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Load all Form 470 records
   */
  loadRecords(lastRefreshId?: string): Observable<Form470Record[]> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    
    let url = `${this.apiUrl}/erate/form470`;
    if (lastRefreshId) {
      url += `?lastRefreshId=${lastRefreshId}`;
    }
    
    return this.http.get<ApiResponse<Form470Record[]>>(url).pipe(
      map(response => response.data || []),
      tap(records => {
        // Mark records as new based on newKeys
        const newKeys = this.newKeysSubject.getValue();
        const markedRecords = records.map(r => ({
          ...r,
          IsNew: newKeys.has(r.PrimaryKey)
        }));
        this.recordsSubject.next(markedRecords);
        this.loadingSubject.next(false);
      }),
      catchError(error => {
        console.error('[ERateService] Failed to load records:', error);
        this.errorSubject.next('Failed to load Form 470 records. Please try again.');
        this.loadingSubject.next(false);
        return of([]);
      })
    );
  }

  /**
   * Download updates from USAC SODA API
   */
  downloadUpdates(): Observable<RefreshResult | null> {
    this.downloadingSubject.next(true);
    this.errorSubject.next(null);
    
    return this.http.post<ApiResponse<RefreshResult>>(`${this.apiUrl}/erate/form470/download`, {}).pipe(
      map(response => response.data),
      tap(result => {
        if (result) {
          // Store new keys for highlighting
          this.newKeysSubject.next(new Set(result.newKeys));
          
          // Update last refresh
          this.lastRefreshSubject.next({
            Id: result.refreshId,
            RefreshStartedAt: new Date(),
            RefreshCompletedAt: new Date(),
            Status: result.error ? 'Failed' : 'Completed',
            TotalFetched: result.totalFetched,
            TotalNew: result.totalNew,
            TotalUpdated: result.totalUpdated,
            ErrorMessage: result.error
          });
          
          // Reload records with new data
          this.loadRecords(result.refreshId).subscribe();
        }
        this.downloadingSubject.next(false);
      }),
      catchError(error => {
        console.error('[ERateService] Download failed:', error);
        const errorMessage = error.error?.message || error.message || 'Failed to download updates. Please try again.';
        this.errorSubject.next(errorMessage);
        this.downloadingSubject.next(false);
        return of(null);
      })
    );
  }

  /**
   * Get latest refresh info
   */
  loadLatestRefresh(): Observable<RefreshHistory | null> {
    return this.http.get<ApiResponse<RefreshHistory | null>>(`${this.apiUrl}/erate/form470/refresh/latest`).pipe(
      map(response => response.data),
      tap(refresh => {
        this.lastRefreshSubject.next(refresh);
      }),
      catchError(error => {
        console.error('[ERateService] Failed to load latest refresh:', error);
        return of(null);
      })
    );
  }

  /**
   * Get refresh history
   */
  loadRefreshHistory(limit: number = 10): Observable<RefreshHistory[]> {
    return this.http.get<ApiResponse<RefreshHistory[]>>(`${this.apiUrl}/erate/form470/refresh/history?limit=${limit}`).pipe(
      map(response => response.data || []),
      catchError(error => {
        console.error('[ERateService] Failed to load refresh history:', error);
        return of([]);
      })
    );
  }

  /**
   * Run database migration
   */
  runMigration(): Observable<{ results: string[] } | null> {
    return this.http.post<ApiResponse<{ results: string[] }>>(`${this.apiUrl}/erate/run-migration`, {}).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('[ERateService] Migration failed:', error);
        this.errorSubject.next('Database migration failed: ' + (error.error?.error || error.message));
        return of(null);
      })
    );
  }

  /**
   * Update user status on a record
   */
  updateUserStatus(recordId: string, userStatus: string): Observable<boolean> {
    return this.http.patch<ApiResponse<any>>(`${this.apiUrl}/erate/form470/${recordId}/status`, { userStatus }).pipe(
      map(response => response.success),
      tap(success => {
        if (success) {
          // Update the record in local state
          const records = this.recordsSubject.getValue();
          const updatedRecords = records.map(r => 
            r.Id === recordId ? { ...r, UserStatus: userStatus || undefined } : r
          );
          this.recordsSubject.next(updatedRecords);
        }
      }),
      catchError(error => {
        console.error('[ERateService] Failed to update status:', error);
        this.errorSubject.next('Failed to update status. Please try again.');
        return of(false);
      })
    );
  }

  /**
   * Clear new record highlighting
   */
  clearNewHighlights(): void {
    this.newKeysSubject.next(new Set());
    // Update records to remove IsNew flag
    const records = this.recordsSubject.getValue();
    this.recordsSubject.next(records.map(r => ({ ...r, IsNew: false })));
  }

  /**
   * Get current records
   */
  getRecords(): Form470Record[] {
    return this.recordsSubject.getValue();
  }

  /**
   * Check if a record is new
   */
  isNewRecord(primaryKey: string): boolean {
    return this.newKeysSubject.getValue().has(primaryKey);
  }

  /**
   * Parse form PDF URL from JSON string
   */
  getFormPdfUrl(record: Form470Record): string | null {
    if (!record.FormPdf) return null;
    try {
      const parsed = JSON.parse(record.FormPdf);
      return parsed.url || null;
    } catch {
      return record.FormPdf; // Return as-is if not JSON
    }
  }

  /**
   * Parse RFP documents URL from JSON string
   */
  getRfpDocumentsUrl(record: Form470Record): string | null {
    if (!record.RfpDocuments) return null;
    try {
      const parsed = JSON.parse(record.RfpDocuments);
      return parsed.url || null;
    } catch {
      return record.RfpDocuments; // Return as-is if not JSON
    }
  }
}
