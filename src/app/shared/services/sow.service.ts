import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, of, map } from 'rxjs';
import { environment } from '../../../environments/environment';

// ================================================================
// INTERFACES
// ================================================================

export interface ReferenceArchitecture {
  Id?: string;
  Name: string;
  Description?: string;
  Category?: string;
  IconName?: string;
  IsActive: boolean;
  SortOrder?: number;
  CreatedAt?: Date;
  UpdatedAt?: Date;
}

export interface SOWType {
  Id?: string;
  Name: string;
  Description?: string;
  Category?: string;
  TemplateFileName?: string;
  OverviewTemplate?: string;
  ScopeTemplate?: string;
  MethodologyTemplate?: string;
  DeliverablesTemplate?: string;
  RecommendationsTemplate?: string;
  AIPromptOverview?: string;
  AIPromptFindings?: string;
  AIPromptRecommendations?: string;
  AIPromptScope?: string;
  AITemperature?: number;
  ResourceFolder?: string;
  DefaultHours?: number;
  DefaultRate?: number;
  IsActive: boolean;
  SortOrder?: number;
  CreatedAt?: Date;
  UpdatedAt?: Date;
  ReferenceArchitectures?: ReferenceArchitecture[];
  // For multi-select binding
  selectedArchitectureIds?: string[];
}

export interface GeneratedSOW {
  Id?: string;
  SOWTypeId: string;
  ReferenceArchitectureId: string;
  QuoteId?: string;
  CustomerName: string;
  CustomerContact?: string;
  CustomerEmail?: string;
  Title: string;
  ExecutiveSummary?: string;
  Scope?: string;
  Methodology?: string;
  Findings?: string;
  Recommendations?: string;
  NextSteps?: string;
  EstimatedHours?: number;
  HourlyRate?: number;
  TotalPrice?: number;
  FileName?: string;
  FileSizeBytes?: number;
  Status: string;
  GeneratedBy?: string;
  Notes?: string;
  CreatedAt?: Date;
  UpdatedAt?: Date;
  SOWTypeName?: string;
  ReferenceArchitectureName?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  statusCode?: number;
}

// ================================================================
// SOW SERVICE
// ================================================================

@Injectable({
  providedIn: 'root'
})
export class SOWService {
  private apiUrl = environment.apiUrl;

  // Reference Architectures (shared with Assessment)
  private referenceArchitecturesSubject = new BehaviorSubject<ReferenceArchitecture[]>([]);
  public referenceArchitectures$ = this.referenceArchitecturesSubject.asObservable();

  // SOW Types
  private sowTypesSubject = new BehaviorSubject<SOWType[]>([]);
  public sowTypes$ = this.sowTypesSubject.asObservable();

  // Generated SOWs
  private generatedSOWsSubject = new BehaviorSubject<GeneratedSOW[]>([]);
  public generatedSOWs$ = this.generatedSOWsSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  constructor(private http: HttpClient) {}

  // ================================================================
  // REFERENCE ARCHITECTURES (reuses same backend endpoint)
  // ================================================================

  loadReferenceArchitectures(activeOnly: boolean = false): Observable<ReferenceArchitecture[]> {
    this.loadingSubject.next(true);
    const url = `${this.apiUrl}/reference-architectures${activeOnly ? '?activeOnly=true' : ''}`;

    return this.http.get<ApiResponse<ReferenceArchitecture[]>>(url).pipe(
      map(response => response.data || []),
      tap(architectures => {
        this.referenceArchitecturesSubject.next(architectures);
        this.loadingSubject.next(false);
      }),
      catchError(error => {
        console.error('Error loading reference architectures:', error);
        this.loadingSubject.next(false);
        return of([]);
      })
    );
  }

  // ================================================================
  // SOW TYPES
  // ================================================================

  loadSOWTypes(activeOnly: boolean = false): Observable<SOWType[]> {
    this.loadingSubject.next(true);
    const url = `${this.apiUrl}/sow-types${activeOnly ? '?activeOnly=true' : ''}`;

    return this.http.get<ApiResponse<SOWType[]>>(url).pipe(
      map(response => response.data || []),
      tap(types => {
        this.sowTypesSubject.next(types);
        this.loadingSubject.next(false);
      }),
      catchError(error => {
        console.error('Error loading SOW types:', error);
        this.loadingSubject.next(false);
        return of([]);
      })
    );
  }

  getSOWType(id: string): Observable<SOWType | null> {
    return this.http.get<ApiResponse<SOWType>>(`${this.apiUrl}/sow-types/${id}`).pipe(
      map(response => response.data || null),
      catchError(error => {
        console.error('Error fetching SOW type:', error);
        return of(null);
      })
    );
  }

  createSOWType(sowType: SOWType): Observable<SOWType | null> {
    // Convert selectedArchitectureIds to ReferenceArchitectures
    if (sowType.selectedArchitectureIds && sowType.selectedArchitectureIds.length > 0) {
      sowType.ReferenceArchitectures = sowType.selectedArchitectureIds.map(id => ({ Id: id } as ReferenceArchitecture));
    }

    return this.http.post<ApiResponse<SOWType>>(`${this.apiUrl}/sow-types`, sowType).pipe(
      map(response => response.data),
      tap(() => this.loadSOWTypes().subscribe()),
      catchError(error => {
        console.error('Error creating SOW type:', error);
        return of(null);
      })
    );
  }

  updateSOWType(id: string, sowType: Partial<SOWType>): Observable<SOWType | null> {
    // Convert selectedArchitectureIds to ReferenceArchitectures
    if (sowType.selectedArchitectureIds && sowType.selectedArchitectureIds.length > 0) {
      sowType.ReferenceArchitectures = sowType.selectedArchitectureIds.map(archId => ({ Id: archId } as ReferenceArchitecture));
    }

    return this.http.put<ApiResponse<SOWType>>(`${this.apiUrl}/sow-types/${id}`, sowType).pipe(
      map(response => response.data),
      tap(() => this.loadSOWTypes().subscribe()),
      catchError(error => {
        console.error('Error updating SOW type:', error);
        return of(null);
      })
    );
  }

  deleteSOWType(id: string): Observable<boolean> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/sow-types/${id}`).pipe(
      map(() => true),
      tap(() => this.loadSOWTypes().subscribe()),
      catchError(error => {
        console.error('Error deleting SOW type:', error);
        return of(false);
      })
    );
  }

  toggleSOWTypeStatus(id: string): void {
    const types = this.sowTypesSubject.getValue();
    const type = types.find(t => t.Id === id);
    if (type) {
      this.updateSOWType(id, { ...type, IsActive: !type.IsActive }).subscribe();
    }
  }

  // ================================================================
  // GENERATED SOWS
  // ================================================================

  loadGeneratedSOWs(): Observable<GeneratedSOW[]> {
    this.loadingSubject.next(true);

    return this.http.get<ApiResponse<GeneratedSOW[]>>(`${this.apiUrl}/generated-sows`).pipe(
      map(response => response.data || []),
      tap(sows => {
        this.generatedSOWsSubject.next(sows);
        this.loadingSubject.next(false);
      }),
      catchError(error => {
        console.error('Error loading generated SOWs:', error);
        this.loadingSubject.next(false);
        return of([]);
      })
    );
  }

  getGeneratedSOW(id: string): Observable<GeneratedSOW | null> {
    return this.http.get<ApiResponse<GeneratedSOW>>(`${this.apiUrl}/generated-sows/${id}`).pipe(
      map(response => response.data || null),
      catchError(error => {
        console.error('Error fetching generated SOW:', error);
        return of(null);
      })
    );
  }

  createGeneratedSOW(sow: GeneratedSOW, fileDataBase64?: string): Observable<GeneratedSOW | null> {
    const payload: any = { ...sow };
    if (fileDataBase64) {
      payload.FileDataBase64 = fileDataBase64;
    }

    return this.http.post<ApiResponse<GeneratedSOW>>(`${this.apiUrl}/generated-sows`, payload).pipe(
      map(response => response.data),
      tap(() => this.loadGeneratedSOWs().subscribe()),
      catchError(error => {
        console.error('Error creating generated SOW:', error);
        return of(null);
      })
    );
  }

  updateGeneratedSOW(id: string, sow: Partial<GeneratedSOW>): Observable<GeneratedSOW | null> {
    return this.http.put<ApiResponse<GeneratedSOW>>(`${this.apiUrl}/generated-sows/${id}`, sow).pipe(
      map(response => response.data),
      tap(() => this.loadGeneratedSOWs().subscribe()),
      catchError(error => {
        console.error('Error updating generated SOW:', error);
        return of(null);
      })
    );
  }

  updateSOWDocument(id: string, fileName: string, fileDataBase64: string): Observable<boolean> {
    return this.http.put<ApiResponse<void>>(`${this.apiUrl}/generated-sows/${id}/document`, {
      FileName: fileName,
      FileDataBase64: fileDataBase64
    }).pipe(
      map(() => true),
      tap(() => this.loadGeneratedSOWs().subscribe()),
      catchError(error => {
        console.error('Error updating SOW document:', error);
        return of(false);
      })
    );
  }

  updateSOWStatus(id: string, status: string): Observable<boolean> {
    return this.http.put<ApiResponse<void>>(`${this.apiUrl}/generated-sows/${id}/status`, { status }).pipe(
      map(() => true),
      tap(() => this.loadGeneratedSOWs().subscribe()),
      catchError(error => {
        console.error('Error updating SOW status:', error);
        return of(false);
      })
    );
  }

  downloadSOW(id: string): void {
    window.open(`${this.apiUrl}/generated-sows/${id}/download`, '_blank');
  }

  deleteGeneratedSOW(id: string): Observable<boolean> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/generated-sows/${id}`).pipe(
      map(() => true),
      tap(() => this.loadGeneratedSOWs().subscribe()),
      catchError(error => {
        console.error('Error deleting generated SOW:', error);
        return of(false);
      })
    );
  }
}
