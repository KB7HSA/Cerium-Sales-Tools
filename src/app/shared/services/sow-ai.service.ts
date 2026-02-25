import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SOWAIGenerationContext {
  prompt: string;
  customerName: string;
  companyName?: string;
  customerEmail?: string;
  referenceArchitecture: string;
  assessmentType: string; // reuses AI backend field name
  assessmentTypeDescription?: string;
  assessmentTypeCategory?: string;
  scopeContext?: string;
  methodologyContext?: string;
  additionalNotes?: string;
  technicalResources?: string;
  temperature?: number;
}

export interface SOWAIGenerationResponse {
  generated: boolean;
  content: string;
  tokens?: number;
  model?: string;
  finishReason?: string;
}

export interface SOWAIStatusResponse {
  configured: boolean;
  message: string;
  model?: string;
}

export interface SOWAIDocumentReviewResponse {
  rating: number;
  suggestions: string[];
  summary: string;
}

/**
 * SOW AI Service for generating personalized SOW content.
 * Reuses the same backend Azure OpenAI endpoints as the Assessment AI service.
 */
@Injectable({
  providedIn: 'root'
})
export class SOWAIService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  checkAIStatus(): Observable<SOWAIStatusResponse> {
    return this.http.get<{ data: SOWAIStatusResponse }>(`${this.apiUrl}/ai/status`).pipe(
      map(response => response.data),
      catchError(() => of({ configured: false, message: 'Cannot reach AI service' }))
    );
  }

  generateContent(context: SOWAIGenerationContext): Observable<SOWAIGenerationResponse> {
    return this.http.post<{ data: SOWAIGenerationResponse }>(`${this.apiUrl}/ai/generate`, context).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('SOW AI generation error:', error);
        return of({
          generated: false,
          content: 'AI generation failed. Please try again or check the Azure OpenAI configuration.',
          tokens: 0,
          model: 'error',
          finishReason: 'error',
        });
      })
    );
  }

  generateExecutiveSummary(context: SOWAIGenerationContext): Observable<string> {
    return this.http.post<{ data: SOWAIGenerationResponse }>(`${this.apiUrl}/ai/generate`, context).pipe(
      map(response => response.data.content),
      catchError(error => {
        console.error('SOW AI executive summary error:', error);
        return of(`Statement of Work for ${context.customerName} - ${context.assessmentType}`);
      })
    );
  }

  generateFindings(context: SOWAIGenerationContext): Observable<string> {
    return this.http.post<{ data: SOWAIGenerationResponse }>(`${this.apiUrl}/ai/generate/findings`, context).pipe(
      map(response => response.data.content),
      catchError(error => {
        console.error('SOW AI findings error:', error);
        return of('Unable to generate AI findings. Please try again.');
      })
    );
  }

  generateRecommendations(context: SOWAIGenerationContext): Observable<string> {
    return this.http.post<{ data: SOWAIGenerationResponse }>(`${this.apiUrl}/ai/generate/recommendations`, context).pipe(
      map(response => response.data.content),
      catchError(error => {
        console.error('SOW AI recommendations error:', error);
        return of('Unable to generate AI recommendations. Please try again.');
      })
    );
  }

  generateScope(context: SOWAIGenerationContext): Observable<string> {
    return this.http.post<{ data: SOWAIGenerationResponse }>(`${this.apiUrl}/ai/generate/scope`, context).pipe(
      map(response => response.data.content),
      catchError(error => {
        console.error('SOW AI scope error:', error);
        return of('Unable to generate AI scope. Please try again.');
      })
    );
  }

  debugPromptPreview(context: SOWAIGenerationContext): Observable<{ systemPrompt: string; userPrompt: string; model: string; configured: boolean }> {
    return this.http.post<{ data: { systemPrompt: string; userPrompt: string; model: string; configured: boolean } }>(`${this.apiUrl}/ai/debug-prompt`, context).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Debug prompt preview error:', error);
        return of({ systemPrompt: 'Error fetching prompt', userPrompt: 'Error fetching prompt', model: 'unknown', configured: false });
      })
    );
  }

  getTechnicalResources(folder: string): Observable<{ content: string; files: string[]; totalSize: number }> {
    return this.http.get<{ data: { content: string; files: string[]; totalSize: number } }>(`${this.apiUrl}/technical-resources/content`, {
      params: { folder }
    }).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Technical resources error:', error);
        return of({ content: '', files: [], totalSize: 0 });
      })
    );
  }

  reviewDocument(documentContent: string, sowType: string, customerName: string): Observable<SOWAIDocumentReviewResponse> {
    return this.http.post<{ data: SOWAIDocumentReviewResponse }>(`${this.apiUrl}/ai/review`, {
      documentContent,
      assessmentType: sowType, // reuse backend field
      customerName,
    }).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('SOW AI document review error:', error);
        return of({
          rating: 0,
          suggestions: ['Review failed. Please try again.'],
          summary: 'Unable to complete review.',
        });
      })
    );
  }
}
