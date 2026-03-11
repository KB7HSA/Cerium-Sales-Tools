import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, of, map } from 'rxjs';
import { environment } from '../../../environments/environment';

// ================================================================
// INTERFACES
// ================================================================

export interface DocumentConversionType {
  Id?: string;
  Name: string;
  Description?: string;
  Category?: string;
  TemplateFileName?: string;
  HeaderContent?: string;
  FooterContent?: string;
  HeaderXml?: string;
  FooterXml?: string;
  OutputFileNamePattern?: string;
  AcceptedFileTypes?: string; // 'docx', 'pdf', or 'both'
  ConversionMethod?: string; // 'template-apply', 'pdf-to-docx', 'pdf-extract'
  UseAdobeApi?: boolean; // true = ConvertAPI high-fidelity, false = local text extraction
  IsActive: boolean;
  SortOrder?: number;
  CreatedAt?: Date;
  UpdatedAt?: Date;
}

export interface ConvertApiStatus {
  configured: boolean;
  connected: boolean;
  message: string;
  estimatedTime: string | null;
  initTimeMs?: number;
  secondsLeft?: number;
  error?: string;
}

export interface ConvertedDocument {
  Id?: string;
  ConversionTypeId: string;
  OriginalFileName: string;
  ConvertedFileName?: string;
  FileSizeBytes?: number;
  Status: string;
  ConvertedBy?: string;
  Notes?: string;
  CreatedAt?: Date;
  UpdatedAt?: Date;
  ConversionTypeName?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  statusCode?: number;
}

// ================================================================
// DOCUMENT CONVERSION SERVICE
// ================================================================

@Injectable({
  providedIn: 'root'
})
export class DocumentConversionService {
  private apiUrl = environment.apiUrl;

  // Document Conversion Types
  private conversionTypesSubject = new BehaviorSubject<DocumentConversionType[]>([]);
  public conversionTypes$ = this.conversionTypesSubject.asObservable();

  // Converted Documents (history)
  private convertedDocumentsSubject = new BehaviorSubject<ConvertedDocument[]>([]);
  public convertedDocuments$ = this.convertedDocumentsSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  constructor(private http: HttpClient) {}

  // ================================================================
  // DOCUMENT CONVERSION TYPES
  // ================================================================

  loadConversionTypes(activeOnly: boolean = false): Observable<DocumentConversionType[]> {
    this.loadingSubject.next(true);
    const url = `${this.apiUrl}/document-conversion-types${activeOnly ? '?activeOnly=true' : ''}`;

    return this.http.get<ApiResponse<DocumentConversionType[]>>(url).pipe(
      map(response => response.data || []),
      tap(types => {
        this.conversionTypesSubject.next(types);
        this.loadingSubject.next(false);
      }),
      catchError(error => {
        console.error('Error loading document conversion types:', error);
        this.loadingSubject.next(false);
        return of([]);
      })
    );
  }

  getConversionType(id: string): Observable<DocumentConversionType | null> {
    return this.http.get<ApiResponse<DocumentConversionType>>(`${this.apiUrl}/document-conversion-types/${id}`).pipe(
      map(response => response.data || null),
      catchError(error => {
        console.error('Error fetching document conversion type:', error);
        return of(null);
      })
    );
  }

  createConversionType(convType: DocumentConversionType): Observable<DocumentConversionType | null> {
    return this.http.post<ApiResponse<DocumentConversionType>>(`${this.apiUrl}/document-conversion-types`, convType).pipe(
      map(response => response.data),
      tap(() => this.loadConversionTypes().subscribe()),
      catchError(error => {
        console.error('Error creating document conversion type:', error);
        return of(null);
      })
    );
  }

  updateConversionType(id: string, convType: Partial<DocumentConversionType>): Observable<DocumentConversionType | null> {
    return this.http.put<ApiResponse<DocumentConversionType>>(`${this.apiUrl}/document-conversion-types/${id}`, convType).pipe(
      map(response => response.data),
      tap(() => this.loadConversionTypes().subscribe()),
      catchError(error => {
        console.error('Error updating document conversion type:', error);
        return of(null);
      })
    );
  }

  deleteConversionType(id: string): Observable<boolean> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/document-conversion-types/${id}`).pipe(
      map(() => true),
      tap(() => this.loadConversionTypes().subscribe()),
      catchError(error => {
        console.error('Error deleting document conversion type:', error);
        return of(false);
      })
    );
  }

  toggleConversionTypeStatus(id: string): void {
    const types = this.conversionTypesSubject.getValue();
    const type = types.find(t => t.Id === id);
    if (type) {
      this.updateConversionType(id, { ...type, IsActive: !type.IsActive }).subscribe();
    }
  }

  // ================================================================
  // CONVERTED DOCUMENTS
  // ================================================================

  loadConvertedDocuments(): Observable<ConvertedDocument[]> {
    this.loadingSubject.next(true);

    return this.http.get<ApiResponse<ConvertedDocument[]>>(`${this.apiUrl}/converted-documents`).pipe(
      map(response => response.data || []),
      tap(docs => {
        this.convertedDocumentsSubject.next(docs);
        this.loadingSubject.next(false);
      }),
      catchError(error => {
        console.error('Error loading converted documents:', error);
        this.loadingSubject.next(false);
        return of([]);
      })
    );
  }

  /**
   * Convert a document: upload source DOCX + selected conversion type
   * Returns the converted document record (file can be downloaded separately)
   */
  convertDocument(conversionTypeId: string, file: File, convertedBy?: string): Observable<ConvertedDocument | null> {
    return new Observable(observer => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        const payload = {
          ConversionTypeId: conversionTypeId,
          OriginalFileName: file.name,
          FileDataBase64: base64,
          ConvertedBy: convertedBy || null
        };

        this.http.post<ApiResponse<ConvertedDocument>>(`${this.apiUrl}/converted-documents`, payload).pipe(
          map(response => response.data),
          tap(() => this.loadConvertedDocuments().subscribe()),
          catchError(error => {
            console.error('Error converting document:', error);
            const message = error?.error?.message || error?.error?.error || error?.message || 'Unknown error';
            throw new Error(`Failed to convert document: ${message}`);
          })
        ).subscribe({
          next: result => {
            observer.next(result);
            observer.complete();
          },
          error: err => observer.error(err)
        });
      };
      reader.onerror = () => observer.error(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  downloadConvertedDocument(id: string): Observable<Blob | null> {
    return this.http.get(`${this.apiUrl}/converted-documents/${id}/download`, {
      responseType: 'blob'
    }).pipe(
      catchError(error => {
        console.error('Error downloading converted document:', error);
        return of(null);
      })
    );
  }

  deleteConvertedDocument(id: string): Observable<boolean> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/converted-documents/${id}`).pipe(
      map(() => true),
      tap(() => this.loadConvertedDocuments().subscribe()),
      catchError(error => {
        console.error('Error deleting converted document:', error);
        return of(false);
      })
    );
  }

  // ================================================================
  // CONVERTAPI STATUS
  // ================================================================

  checkConvertApiStatus(): Observable<ConvertApiStatus | null> {
    return this.http.get<ApiResponse<ConvertApiStatus>>(`${this.apiUrl}/convert-api-status`).pipe(
      map(response => response.data || null),
      catchError(error => {
        console.error('Error checking ConvertAPI status:', error);
        return of(null);
      })
    );
  }

  /**
   * Extract header/footer XML from a template file
   */
  extractHeaderFooterFromTemplate(templateFileName: string): Observable<{
    headerXml: string | null;
    footerXml: string | null;
    details: Array<{ kind: string; type: string; partFile: string; innerXml: string }>;
  } | null> {
    return this.http.get<ApiResponse<{
      headerXml: string | null;
      footerXml: string | null;
      details: Array<{ kind: string; type: string; partFile: string; innerXml: string }>;
    }>>(
      `${this.apiUrl}/extract-header-footer/${encodeURIComponent(templateFileName)}`
    ).pipe(
      map(response => response.data || null),
      catchError(error => {
        console.error('Error extracting header/footer:', error);
        return of(null);
      })
    );
  }
}
