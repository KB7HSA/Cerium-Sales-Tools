import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ExportSchemaColumn {
  Id?: string;
  SchemaId?: string;
  SourceField: string;
  ExportHeader: string;
  DisplayOrder: number;
  IsIncluded: boolean;
  FormatType?: string;
  CreatedAt?: Date;
}

export interface ExportSchema {
  Id?: string;
  Name: string;
  QuoteType: string;
  Description?: string;
  IsDefault: boolean;
  IsActive: boolean;
  CreatedAt?: Date;
  UpdatedAt?: Date;
  columns?: ExportSchemaColumn[];
}

export interface AvailableField {
  field: string;
  label: string;
  formatType: string;
}

export interface QuoteType {
  value: string;
  label: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  statusCode: number;
}

@Injectable({
  providedIn: 'root'
})
export class ExportSchemaService {
  private apiUrl = `${environment.apiUrl}/export-schemas`;
  
  private schemasSubject = new BehaviorSubject<ExportSchema[]>([]);
  schemas$ = this.schemasSubject.asObservable();
  
  private availableFieldsSubject = new BehaviorSubject<AvailableField[]>([]);
  availableFields$ = this.availableFieldsSubject.asObservable();
  
  private quoteTypesSubject = new BehaviorSubject<QuoteType[]>([
    { value: 'msp', label: 'MSP Service' },
    { value: 'labor', label: 'Labor Budget' }
  ]);
  quoteTypes$ = this.quoteTypesSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadSchemas();
    this.loadAvailableFields();
    this.loadQuoteTypes();
  }

  /**
   * Load all export schemas from API
   */
  loadSchemas(): void {
    this.http.get<ApiResponse<ExportSchema[]>>(this.apiUrl)
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.schemasSubject.next(response.data);
          }
        },
        error: (error) => console.error('[ExportSchemaService] Failed to load schemas:', error)
      });
  }

  /**
   * Load available fields for export configuration
   */
  loadAvailableFields(): void {
    this.http.get<ApiResponse<AvailableField[]>>(`${this.apiUrl}/available-fields`)
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.availableFieldsSubject.next(response.data);
          }
        },
        error: (error) => console.error('[ExportSchemaService] Failed to load available fields:', error)
      });
  }

  /**
   * Load quote types
   */
  loadQuoteTypes(): void {
    this.http.get<ApiResponse<QuoteType[]>>(`${this.apiUrl}/quote-types`)
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.quoteTypesSubject.next(response.data);
          }
        },
        error: (error) => console.error('[ExportSchemaService] Failed to load quote types:', error)
      });
  }

  /**
   * Get all schemas
   */
  getAllSchemas(): Observable<ApiResponse<ExportSchema[]>> {
    return this.http.get<ApiResponse<ExportSchema[]>>(this.apiUrl);
  }

  /**
   * Get schemas by quote type
   */
  getSchemasByQuoteType(quoteType: string): Observable<ApiResponse<ExportSchema[]>> {
    return this.http.get<ApiResponse<ExportSchema[]>>(`${this.apiUrl}/by-type/${quoteType}`);
  }

  /**
   * Get default schema for quote type
   */
  getDefaultSchema(quoteType: string): Observable<ApiResponse<ExportSchema>> {
    return this.http.get<ApiResponse<ExportSchema>>(`${this.apiUrl}/default/${quoteType}`);
  }

  /**
   * Get schema by ID
   */
  getSchemaById(id: string): Observable<ApiResponse<ExportSchema>> {
    return this.http.get<ApiResponse<ExportSchema>>(`${this.apiUrl}/${id}`);
  }

  /**
   * Create new export schema
   */
  createSchema(schema: Partial<ExportSchema>): Observable<ApiResponse<ExportSchema>> {
    return this.http.post<ApiResponse<ExportSchema>>(this.apiUrl, schema)
      .pipe(
        tap(response => {
          if (response.success) {
            this.loadSchemas();
          }
        })
      );
  }

  /**
   * Update export schema
   */
  updateSchema(id: string, updates: Partial<ExportSchema>): Observable<ApiResponse<ExportSchema>> {
    return this.http.put<ApiResponse<ExportSchema>>(`${this.apiUrl}/${id}`, updates)
      .pipe(
        tap(response => {
          if (response.success) {
            this.loadSchemas();
          }
        })
      );
  }

  /**
   * Delete export schema
   */
  deleteSchema(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`)
      .pipe(
        tap(response => {
          if (response.success) {
            this.loadSchemas();
          }
        })
      );
  }

  /**
   * Get current schemas value
   */
  getSchemas(): ExportSchema[] {
    return this.schemasSubject.value;
  }

  /**
   * Get available fields
   */
  getAvailableFields(): AvailableField[] {
    return this.availableFieldsSubject.value;
  }

  /**
   * Get quote types
   */
  getQuoteTypes(): QuoteType[] {
    return this.quoteTypesSubject.value;
  }
}
