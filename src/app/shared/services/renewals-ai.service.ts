import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface RenewalsAIPrompt {
  promptKey: string;
  promptText: string;
  temperature: number;
  maxTokens: number;
  updatedAt: string | null;
  updatedBy: string | null;
  isDefault?: boolean;
}

export interface RenewalsAIAnalysisRequest {
  customerName: string;
  hardwareItems: any[];
  softwareItems: any[];
  hwSummary: any;
  swSummary: any;
  hwByArchitecture: any[];
  swByArchitecture: any[];
  hwEolTimeline: any[];
  swEndingSoon: any[];
}

export interface RenewalsAIAnalysisResponse {
  generated: boolean;
  content: string;
  tokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  model?: string;
  finishReason?: string;
  systemPrompt?: string;
  userPrompt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RenewalsAIService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /** Check if Azure OpenAI is configured */
  checkAIStatus(): Observable<{ configured: boolean; message: string; model?: string }> {
    return this.http.get<{ data: { configured: boolean; message: string; model?: string } }>(`${this.apiUrl}/ai/status`).pipe(
      map(r => r.data),
      catchError(() => of({ configured: false, message: 'Cannot reach AI service' }))
    );
  }

  /** Generate AI renewals analysis for a customer */
  generateAnalysis(request: RenewalsAIAnalysisRequest): Observable<RenewalsAIAnalysisResponse> {
    return this.http.post<{ data: RenewalsAIAnalysisResponse }>(`${this.apiUrl}/ai/renewals-analysis`, request).pipe(
      map(r => r.data)
      // NOTE: Do NOT catchError here — let HTTP errors (401, 500, timeout) propagate
      // to the component so the user sees the real error message.
    );
  }

  /** Get the current renewals AI prompt configuration */
  getPrompt(): Observable<RenewalsAIPrompt> {
    return this.http.get<{ data: RenewalsAIPrompt }>(`${this.apiUrl}/admin/renewals-prompt`).pipe(
      map(r => r.data),
      catchError(error => {
        console.error('Failed to load renewals prompt:', error);
        return of({
          promptKey: 'renewals-summary',
          promptText: '',
          temperature: 0.7,
          maxTokens: 4000,
          updatedAt: null,
          updatedBy: null,
          isDefault: true,
        });
      })
    );
  }

  /** Save the renewals AI prompt configuration */
  savePrompt(promptText: string, temperature: number, maxTokens: number, updatedBy?: string): Observable<{ saved: boolean }> {
    return this.http.put<{ data: { saved: boolean } }>(`${this.apiUrl}/admin/renewals-prompt`, {
      promptText, temperature, maxTokens, updatedBy
    }).pipe(
      map(r => r.data),
      catchError(error => {
        console.error('Failed to save renewals prompt:', error);
        return of({ saved: false });
      })
    );
  }

  /** Reset the renewals AI prompt to the default */
  resetPrompt(): Observable<RenewalsAIPrompt> {
    return this.http.post<{ data: RenewalsAIPrompt }>(`${this.apiUrl}/admin/renewals-prompt/reset`, {}).pipe(
      map(r => r.data),
      catchError(error => {
        console.error('Failed to reset renewals prompt:', error);
        return of({
          promptKey: 'renewals-summary',
          promptText: '',
          temperature: 0.7,
          maxTokens: 4000,
          updatedAt: null,
          updatedBy: null,
          isDefault: true,
        });
      })
    );
  }
}
