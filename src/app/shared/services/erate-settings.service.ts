import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

// ================================================================
// INTERFACES
// ================================================================

export interface ERateSetting {
  Id: string;
  SettingKey: string;
  SettingValue: string;
  Description?: string;
  CreatedAt?: Date;
  UpdatedAt?: Date;
}

export interface ERateStatusCode {
  Id: string;
  StatusCode: string;
  DisplayName: string;
  ColorClass?: string;
  SortOrder: number;
  IsActive: boolean;
  CreatedAt?: Date;
  UpdatedAt?: Date;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// ================================================================
// E-RATE SETTINGS SERVICE
// ================================================================

@Injectable({
  providedIn: 'root'
})
export class ERateSettingsService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Initialize the settings tables
   */
  initializeTables(): Observable<{ results: string[] }> {
    return this.http.post<ApiResponse<{ results: string[] }>>(`${this.apiUrl}/erate/settings/init`, {}).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('[ERateSettingsService] Init failed:', error);
        return of({ results: ['Initialization failed: ' + (error.error?.message || error.message)] });
      })
    );
  }

  /**
   * Get all settings
   */
  getSettings(): Observable<ERateSetting[]> {
    return this.http.get<ApiResponse<ERateSetting[]>>(`${this.apiUrl}/erate/settings`).pipe(
      map(response => response.data || []),
      catchError(error => {
        console.error('[ERateSettingsService] Failed to load settings:', error);
        return of([]);
      })
    );
  }

  /**
   * Update a setting
   */
  updateSetting(key: string, value: string, description?: string): Observable<ERateSetting | null> {
    return this.http.put<ApiResponse<ERateSetting>>(`${this.apiUrl}/erate/settings/${key}`, { value, description }).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('[ERateSettingsService] Failed to update setting:', error);
        return of(null);
      })
    );
  }

  /**
   * Get all status codes
   */
  getStatusCodes(activeOnly: boolean = false): Observable<ERateStatusCode[]> {
    const params = activeOnly ? '?activeOnly=true' : '';
    return this.http.get<ApiResponse<ERateStatusCode[]>>(`${this.apiUrl}/erate/status-codes${params}`).pipe(
      map(response => response.data || []),
      catchError(error => {
        console.error('[ERateSettingsService] Failed to load status codes:', error);
        return of([]);
      })
    );
  }

  /**
   * Create a new status code
   */
  createStatusCode(statusCode: string, displayName: string, colorClass?: string, sortOrder?: number): Observable<ERateStatusCode | null> {
    return this.http.post<ApiResponse<ERateStatusCode>>(`${this.apiUrl}/erate/status-codes`, {
      statusCode,
      displayName,
      colorClass,
      sortOrder
    }).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('[ERateSettingsService] Failed to create status code:', error);
        return of(null);
      })
    );
  }

  /**
   * Update a status code
   */
  updateStatusCode(id: string, updates: Partial<ERateStatusCode>): Observable<ERateStatusCode | null> {
    return this.http.put<ApiResponse<ERateStatusCode>>(`${this.apiUrl}/erate/status-codes/${id}`, updates).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('[ERateSettingsService] Failed to update status code:', error);
        return of(null);
      })
    );
  }

  /**
   * Delete a status code
   */
  deleteStatusCode(id: string): Observable<boolean> {
    return this.http.delete<ApiResponse<null>>(`${this.apiUrl}/erate/status-codes/${id}`).pipe(
      map(() => true),
      catchError(error => {
        console.error('[ERateSettingsService] Failed to delete status code:', error);
        return of(false);
      })
    );
  }
}
