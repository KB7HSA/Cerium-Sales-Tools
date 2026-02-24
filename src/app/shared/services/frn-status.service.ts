import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, of, map } from 'rxjs';
import { environment } from '../../../environments/environment';

// ================================================================
// INTERFACES
// ================================================================

export interface FRNStatusRecord {
  Id?: string;
  PrimaryKey: string;
  FirstSeenAt?: Date;
  LastSeenAt?: Date;
  LastRefreshId?: string;
  UserStatus?: string;
  IsNew?: boolean;

  ApplicationNumber?: string;
  FundingYear?: string;
  State?: string;
  FormVersion?: string;
  IsCertifiedInWindow?: string;
  Ben?: string;
  OrganizationName?: string;
  CnctEmail?: string;
  CrnData?: string;

  FundingRequestNumber?: string;
  Form471FrnStatusName?: string;
  Nickname?: string;
  Form471ServiceTypeName?: string;

  UsacContractId?: string;
  ContractNumber?: string;
  ContractTypeName?: string;
  BidCount?: string;
  IsBasedOnStateMasterContract?: string;
  IsMultipleAward?: string;
  EstablishingForm470?: string;
  Old470Number?: string;
  WasFccForm470Posted?: string;
  AwardDate?: string;
  ExtendedExpirationDate?: string;
  ServiceDeliveryDeadline?: string;

  AccountNumber?: string;
  SpinName?: string;
  SpacFiled?: string;
  EpcOrganizationId?: string;

  HasVoluntaryExtension?: string;
  RemainingExtensionCount?: string;
  TotalRemainingMonthsCount?: string;

  PricingConfidentiality?: string;
  EpcContractRestrictionTypeName?: string;
  RestrictionCitation?: string;
  OldFundingRequestNumber?: string;

  ServiceStartDate?: string;
  ContractExpirationDate?: string;
  Narrative?: string;

  TotalMonthlyRecurringCost?: string;
  TotalMonthlyRecurringIneligibleCosts?: string;
  TotalMonthlyRecurringEligibleCosts?: string;
  MonthsOfService?: string;
  TotalPreDiscountEligibleRecurringCosts?: string;
  TotalOneTimeCosts?: string;
  TotalIneligibleOneTimeCosts?: string;
  TotalPreDiscountEligibleOneTimeCosts?: string;
  TotalPreDiscountCosts?: string;
  DisPct?: string;
  FundingCommitmentRequest?: string;

  Form471FrnFiberTypeName?: string;
  Form471FrnFiberSubTypeName?: string;
  IsLease?: string;
  TotalProjPlantRouteFeet?: string;
  AvgCostPerFtOfPlant?: string;
  TotalStrandsQty?: string;
  EligibleStrandsQty?: string;

  StateTribeMatchAmt?: string;
  SourceOfMatchingFundsDesc?: string;

  TotalFinancedAmt?: string;
  NumberOfTerms?: string;
  AnnualInterestRate?: string;
  BalloonPaymentDesc?: string;
  ScRate?: string;

  PendingReason?: string;
  OrganizationEntityTypeName?: string;

  ActualStartDate?: string;
  Form486No?: string;
  F486CaseStatus?: string;
  InvoicingReady?: string;
  LastDateToInvoice?: string;

  WaveSequenceNumber?: string;
  FcdlLetterDate?: string;
  UserGeneratedFcdlDate?: string;
  FcdlCommentApp?: string;
  FcdlCommentFrn?: string;
  AppealWaveNumber?: string;
  RevisedFcdlDate?: string;

  InvoicingMode?: string;
  TotalAuthorizedDisbursement?: string;
  PostCommitmentRationale?: string;
  RevisedFcdlComment?: string;
}

export interface FRNRefreshResult {
  refreshId: string;
  totalFetched: number;
  totalNew: number;
  totalUpdated: number;
  newKeys: string[];
  error?: string;
}

export interface FRNDownloadProgress {
  phase: string;
  current: number;
  total: number;
  message: string;
  result?: FRNRefreshResult;
}

export interface FRNRefreshHistory {
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
// FRN STATUS SERVICE
// ================================================================

@Injectable({
  providedIn: 'root'
})
export class FRNStatusService {
  private apiUrl = environment.apiUrl;

  private recordsSubject = new BehaviorSubject<FRNStatusRecord[]>([]);
  public records$ = this.recordsSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  private downloadingSubject = new BehaviorSubject<boolean>(false);
  public downloading$ = this.downloadingSubject.asObservable();

  private lastRefreshSubject = new BehaviorSubject<FRNRefreshHistory | null>(null);
  public lastRefresh$ = this.lastRefreshSubject.asObservable();

  private errorSubject = new BehaviorSubject<string | null>(null);
  public error$ = this.errorSubject.asObservable();

  private newKeysSubject = new BehaviorSubject<Set<string>>(new Set());
  public newKeys$ = this.newKeysSubject.asObservable();

  private progressSubject = new BehaviorSubject<FRNDownloadProgress | null>(null);
  public progress$ = this.progressSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Load all FRN Status records
   */
  loadRecords(lastRefreshId?: string): Observable<FRNStatusRecord[]> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    let url = `${this.apiUrl}/erate/frn`;
    if (lastRefreshId) {
      url += `?lastRefreshId=${lastRefreshId}`;
    }

    return this.http.get<ApiResponse<FRNStatusRecord[]>>(url).pipe(
      map(response => response.data || []),
      tap(records => {
        const newKeys = this.newKeysSubject.getValue();
        const markedRecords = records.map(r => ({
          ...r,
          IsNew: newKeys.has(r.PrimaryKey)
        }));
        this.recordsSubject.next(markedRecords);
        this.loadingSubject.next(false);
      }),
      catchError(error => {
        console.error('[FRNStatusService] Failed to load records:', error);
        this.errorSubject.next('Failed to load FRN Status records. Please try again.');
        this.loadingSubject.next(false);
        return of([]);
      })
    );
  }

  /**
   * Download updates from USAC SODA API with SSE progress streaming
   */
  downloadUpdates(): Observable<FRNRefreshResult | null> {
    this.downloadingSubject.next(true);
    this.errorSubject.next(null);
    this.progressSubject.next({ phase: 'connecting', current: 0, total: 0, message: 'Connecting to server...' });

    return new Observable<FRNRefreshResult | null>(subscriber => {
      const url = `${this.apiUrl}/erate/frn/download`;

      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }).then(response => {
        if (!response.ok || !response.body) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const processChunk = ({ done, value }: ReadableStreamReadResult<Uint8Array>): Promise<void> | void => {
          if (done) {
            this.downloadingSubject.next(false);
            this.progressSubject.next(null);
            subscriber.complete();
            return;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.substring(6));

                if (data.phase === 'done' && data.result) {
                  const result = data.result as FRNRefreshResult;
                  this.newKeysSubject.next(new Set(result.newKeys));
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
                  this.progressSubject.next({ phase: 'complete', current: result.totalFetched, total: result.totalFetched, message: `Complete: ${result.totalNew} new, ${result.totalUpdated} updated` });
                  this.loadRecords(result.refreshId).subscribe();
                  this.downloadingSubject.next(false);
                  subscriber.next(result);
                } else if (data.phase === 'error') {
                  this.errorSubject.next(data.message || 'Download failed');
                  this.progressSubject.next({ phase: 'error', current: 0, total: 0, message: data.message || 'Download failed' });
                  this.downloadingSubject.next(false);
                  subscriber.next(null);
                } else {
                  // Progress update
                  this.progressSubject.next(data as FRNDownloadProgress);
                }
              } catch (e) {
                // Skip malformed SSE data
              }
            }
          }

          return reader.read().then(processChunk);
        };

        reader.read().then(processChunk);
      }).catch(error => {
        console.error('[FRNStatusService] Download failed:', error);
        const errorMessage = error.message || 'Failed to download FRN updates. Please try again.';
        this.errorSubject.next(errorMessage);
        this.progressSubject.next({ phase: 'error', current: 0, total: 0, message: errorMessage });
        this.downloadingSubject.next(false);
        subscriber.next(null);
        subscriber.complete();
      });
    });
  }

  /**
   * Get latest refresh info
   */
  loadLatestRefresh(): Observable<FRNRefreshHistory | null> {
    return this.http.get<ApiResponse<FRNRefreshHistory | null>>(`${this.apiUrl}/erate/frn/refresh/latest`).pipe(
      map(response => response.data),
      tap(refresh => {
        this.lastRefreshSubject.next(refresh);
      }),
      catchError(error => {
        console.error('[FRNStatusService] Failed to load latest refresh:', error);
        return of(null);
      })
    );
  }

  /**
   * Get refresh history
   */
  loadRefreshHistory(limit: number = 10): Observable<FRNRefreshHistory[]> {
    return this.http.get<ApiResponse<FRNRefreshHistory[]>>(`${this.apiUrl}/erate/frn/refresh/history?limit=${limit}`).pipe(
      map(response => response.data || []),
      catchError(error => {
        console.error('[FRNStatusService] Failed to load refresh history:', error);
        return of([]);
      })
    );
  }

  /**
   * Update user status on a record
   */
  updateUserStatus(recordId: string, userStatus: string): Observable<boolean> {
    return this.http.patch<ApiResponse<any>>(`${this.apiUrl}/erate/frn/${recordId}/status`, { userStatus }).pipe(
      map(response => response.success),
      tap(success => {
        if (success) {
          const records = this.recordsSubject.getValue();
          const updatedRecords = records.map(r =>
            r.Id === recordId ? { ...r, UserStatus: userStatus || undefined } : r
          );
          this.recordsSubject.next(updatedRecords);
        }
      }),
      catchError(error => {
        console.error('[FRNStatusService] Failed to update status:', error);
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
    const records = this.recordsSubject.getValue();
    this.recordsSubject.next(records.map(r => ({ ...r, IsNew: false })));
  }

  /**
   * Get current records
   */
  getRecords(): FRNStatusRecord[] {
    return this.recordsSubject.getValue();
  }
}
