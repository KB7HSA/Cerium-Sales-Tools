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

export interface AssessmentType {
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

export interface GeneratedAssessment {
  Id?: string;
  AssessmentTypeId: string;
  ReferenceArchitectureId: string;
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
  AssessmentTypeName?: string;
  ReferenceArchitectureName?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  statusCode?: number;
}

// ================================================================
// ASSESSMENT SERVICE
// ================================================================

@Injectable({
  providedIn: 'root'
})
export class AssessmentService {
  private apiUrl = environment.apiUrl;
  
  // Reference Architectures
  private referenceArchitecturesSubject = new BehaviorSubject<ReferenceArchitecture[]>([]);
  public referenceArchitectures$ = this.referenceArchitecturesSubject.asObservable();
  
  // Assessment Types
  private assessmentTypesSubject = new BehaviorSubject<AssessmentType[]>([]);
  public assessmentTypes$ = this.assessmentTypesSubject.asObservable();
  
  // Generated Assessments
  private generatedAssessmentsSubject = new BehaviorSubject<GeneratedAssessment[]>([]);
  public generatedAssessments$ = this.generatedAssessmentsSubject.asObservable();
  
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  constructor(private http: HttpClient) {}

  // ================================================================
  // REFERENCE ARCHITECTURES
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

  getReferenceArchitecture(id: string): Observable<ReferenceArchitecture | null> {
    return this.http.get<ApiResponse<ReferenceArchitecture>>(`${this.apiUrl}/reference-architectures/${id}`).pipe(
      map(response => response.data || null),
      catchError(error => {
        console.error('Error fetching reference architecture:', error);
        return of(null);
      })
    );
  }

  createReferenceArchitecture(architecture: ReferenceArchitecture): Observable<ReferenceArchitecture | null> {
    return this.http.post<ApiResponse<ReferenceArchitecture>>(`${this.apiUrl}/reference-architectures`, architecture).pipe(
      map(response => response.data),
      tap(() => this.loadReferenceArchitectures().subscribe()),
      catchError(error => {
        console.error('Error creating reference architecture:', error);
        return of(null);
      })
    );
  }

  updateReferenceArchitecture(id: string, architecture: Partial<ReferenceArchitecture>): Observable<ReferenceArchitecture | null> {
    return this.http.put<ApiResponse<ReferenceArchitecture>>(`${this.apiUrl}/reference-architectures/${id}`, architecture).pipe(
      map(response => response.data),
      tap(() => this.loadReferenceArchitectures().subscribe()),
      catchError(error => {
        console.error('Error updating reference architecture:', error);
        return of(null);
      })
    );
  }

  deleteReferenceArchitecture(id: string): Observable<boolean> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/reference-architectures/${id}`).pipe(
      map(() => true),
      tap(() => this.loadReferenceArchitectures().subscribe()),
      catchError(error => {
        console.error('Error deleting reference architecture:', error);
        return of(false);
      })
    );
  }

  // ================================================================
  // ASSESSMENT TYPES
  // ================================================================

  loadAssessmentTypes(activeOnly: boolean = false): Observable<AssessmentType[]> {
    this.loadingSubject.next(true);
    const url = `${this.apiUrl}/assessment-types${activeOnly ? '?activeOnly=true' : ''}`;
    
    return this.http.get<ApiResponse<AssessmentType[]>>(url).pipe(
      map(response => response.data || []),
      tap(types => {
        this.assessmentTypesSubject.next(types);
        this.loadingSubject.next(false);
      }),
      catchError(error => {
        console.error('Error loading assessment types:', error);
        this.loadingSubject.next(false);
        return of([]);
      })
    );
  }

  getAssessmentType(id: string): Observable<AssessmentType | null> {
    return this.http.get<ApiResponse<AssessmentType>>(`${this.apiUrl}/assessment-types/${id}`).pipe(
      map(response => response.data || null),
      catchError(error => {
        console.error('Error fetching assessment type:', error);
        return of(null);
      })
    );
  }

  createAssessmentType(assessmentType: AssessmentType): Observable<AssessmentType | null> {
    // Convert selectedArchitectureIds to ReferenceArchitectures
    if (assessmentType.selectedArchitectureIds && assessmentType.selectedArchitectureIds.length > 0) {
      assessmentType.ReferenceArchitectures = assessmentType.selectedArchitectureIds.map(id => ({ Id: id } as ReferenceArchitecture));
    }
    
    return this.http.post<ApiResponse<AssessmentType>>(`${this.apiUrl}/assessment-types`, assessmentType).pipe(
      map(response => response.data),
      tap(() => this.loadAssessmentTypes().subscribe()),
      catchError(error => {
        console.error('Error creating assessment type:', error);
        return of(null);
      })
    );
  }

  updateAssessmentType(id: string, assessmentType: Partial<AssessmentType>): Observable<AssessmentType | null> {
    // Convert selectedArchitectureIds to ReferenceArchitectures
    if (assessmentType.selectedArchitectureIds && assessmentType.selectedArchitectureIds.length > 0) {
      assessmentType.ReferenceArchitectures = assessmentType.selectedArchitectureIds.map(archId => ({ Id: archId } as ReferenceArchitecture));
    }
    
    return this.http.put<ApiResponse<AssessmentType>>(`${this.apiUrl}/assessment-types/${id}`, assessmentType).pipe(
      map(response => response.data),
      tap(() => this.loadAssessmentTypes().subscribe()),
      catchError(error => {
        console.error('Error updating assessment type:', error);
        return of(null);
      })
    );
  }

  deleteAssessmentType(id: string): Observable<boolean> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/assessment-types/${id}`).pipe(
      map(() => true),
      tap(() => this.loadAssessmentTypes().subscribe()),
      catchError(error => {
        console.error('Error deleting assessment type:', error);
        return of(false);
      })
    );
  }

  toggleAssessmentTypeStatus(id: string): void {
    const types = this.assessmentTypesSubject.getValue();
    const type = types.find(t => t.Id === id);
    if (type) {
      this.updateAssessmentType(id, { ...type, IsActive: !type.IsActive }).subscribe();
    }
  }

  // ================================================================
  // GENERATED ASSESSMENTS
  // ================================================================

  loadGeneratedAssessments(): Observable<GeneratedAssessment[]> {
    this.loadingSubject.next(true);
    
    return this.http.get<ApiResponse<GeneratedAssessment[]>>(`${this.apiUrl}/generated-assessments`).pipe(
      map(response => response.data || []),
      tap(assessments => {
        this.generatedAssessmentsSubject.next(assessments);
        this.loadingSubject.next(false);
      }),
      catchError(error => {
        console.error('Error loading generated assessments:', error);
        this.loadingSubject.next(false);
        return of([]);
      })
    );
  }

  getGeneratedAssessment(id: string): Observable<GeneratedAssessment | null> {
    return this.http.get<ApiResponse<GeneratedAssessment>>(`${this.apiUrl}/generated-assessments/${id}`).pipe(
      map(response => response.data || null),
      catchError(error => {
        console.error('Error fetching generated assessment:', error);
        return of(null);
      })
    );
  }

  createGeneratedAssessment(assessment: GeneratedAssessment, fileDataBase64?: string): Observable<GeneratedAssessment | null> {
    const payload: any = { ...assessment };
    if (fileDataBase64) {
      payload.FileDataBase64 = fileDataBase64;
    }
    
    return this.http.post<ApiResponse<GeneratedAssessment>>(`${this.apiUrl}/generated-assessments`, payload).pipe(
      map(response => response.data),
      tap(() => this.loadGeneratedAssessments().subscribe()),
      catchError(error => {
        console.error('Error creating generated assessment:', error);
        return of(null);
      })
    );
  }

  updateGeneratedAssessment(id: string, assessment: Partial<GeneratedAssessment>): Observable<GeneratedAssessment | null> {
    return this.http.put<ApiResponse<GeneratedAssessment>>(`${this.apiUrl}/generated-assessments/${id}`, assessment).pipe(
      map(response => response.data),
      tap(() => this.loadGeneratedAssessments().subscribe()),
      catchError(error => {
        console.error('Error updating generated assessment:', error);
        return of(null);
      })
    );
  }

  updateAssessmentDocument(id: string, fileName: string, fileDataBase64: string): Observable<boolean> {
    return this.http.put<ApiResponse<void>>(`${this.apiUrl}/generated-assessments/${id}/document`, {
      FileName: fileName,
      FileDataBase64: fileDataBase64
    }).pipe(
      map(() => true),
      tap(() => this.loadGeneratedAssessments().subscribe()),
      catchError(error => {
        console.error('Error updating assessment document:', error);
        return of(false);
      })
    );
  }

  updateAssessmentStatus(id: string, status: string): Observable<boolean> {
    return this.http.put<ApiResponse<void>>(`${this.apiUrl}/generated-assessments/${id}/status`, { status }).pipe(
      map(() => true),
      tap(() => this.loadGeneratedAssessments().subscribe()),
      catchError(error => {
        console.error('Error updating assessment status:', error);
        return of(false);
      })
    );
  }

  downloadAssessment(id: string): void {
    window.open(`${this.apiUrl}/generated-assessments/${id}/download`, '_blank');
  }

  deleteGeneratedAssessment(id: string): Observable<boolean> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/generated-assessments/${id}`).pipe(
      map(() => true),
      tap(() => this.loadGeneratedAssessments().subscribe()),
      catchError(error => {
        console.error('Error deleting generated assessment:', error);
        return of(false);
      })
    );
  }
}
