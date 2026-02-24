import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AIGenerationContext {
  prompt: string;
  customerName: string;
  companyName?: string;
  customerEmail?: string;
  referenceArchitecture: string;
  assessmentType: string;
  assessmentTypeDescription?: string;
  assessmentTypeCategory?: string;
  scopeContext?: string;
  methodologyContext?: string;
  additionalNotes?: string;
  technicalResources?: string;
}

export interface AIGenerationResponse {
  generated: boolean;
  content: string;
  tokens?: number;
  model?: string;
  finishReason?: string;
}

export interface AIStatusResponse {
  configured: boolean;
  message: string;
}

export interface AIDocumentReviewResponse {
  rating: number;
  suggestions: string[];
  summary: string;
}

/**
 * AI Service for generating personalized assessment content.
 * 
 * Calls the backend Azure OpenAI integration for real AI-powered content generation.
 * Falls back to template-based content if Azure OpenAI is not configured.
 */
@Injectable({
  providedIn: 'root'
})
export class AssessmentAIService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Check if Azure OpenAI is configured on the backend
   */
  checkAIStatus(): Observable<AIStatusResponse> {
    return this.http.get<{ data: AIStatusResponse }>(`${this.apiUrl}/ai/status`).pipe(
      map(response => response.data),
      catchError(() => of({ configured: false, message: 'Cannot reach AI service' }))
    );
  }

  /**
   * Generate personalized content using Azure OpenAI via the backend.
   */
  generateContent(context: AIGenerationContext): Observable<AIGenerationResponse> {
    return this.http.post<{ data: AIGenerationResponse }>(`${this.apiUrl}/ai/generate`, context).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('AI generation error:', error);
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

  /**
   * Generate an executive summary for an assessment.
   */
  generateExecutiveSummary(context: AIGenerationContext): Observable<string> {
    return this.http.post<{ data: AIGenerationResponse }>(`${this.apiUrl}/ai/generate`, context).pipe(
      map(response => response.data.content),
      catchError(error => {
        console.error('AI executive summary error:', error);
        return of(this.generateFallbackContent(context.customerName, context.assessmentType, context.referenceArchitecture));
      })
    );
  }

  /**
   * Generate findings section for an assessment.
   */
  generateFindings(context: AIGenerationContext): Observable<string> {
    return this.http.post<{ data: AIGenerationResponse }>(`${this.apiUrl}/ai/generate/findings`, context).pipe(
      map(response => response.data.content),
      catchError(error => {
        console.error('AI findings error:', error);
        return of('Unable to generate AI findings. Please try again or check configuration.');
      })
    );
  }

  /**
   * Generate recommendations for an assessment.
   */
  generateRecommendations(context: AIGenerationContext): Observable<string> {
    return this.http.post<{ data: AIGenerationResponse }>(`${this.apiUrl}/ai/generate/recommendations`, context).pipe(
      map(response => response.data.content),
      catchError(error => {
        console.error('AI recommendations error:', error);
        return of('Unable to generate AI recommendations. Please try again or check configuration.');
      })
    );
  }

  /**
   * Generate proposed assessment scope.
   */
  generateScope(context: AIGenerationContext): Observable<string> {
    return this.http.post<{ data: AIGenerationResponse }>(`${this.apiUrl}/ai/generate/scope`, context).pipe(
      map(response => response.data.content),
      catchError(error => {
        console.error('AI scope error:', error);
        return of('Unable to generate AI scope. Please try again or check configuration.');
      })
    );
  }

  /**
   * Debug: Get a preview of the prompt that would be sent to Azure OpenAI
   */
  debugPromptPreview(context: AIGenerationContext): Observable<{ systemPrompt: string; userPrompt: string; model: string; configured: boolean }> {
    return this.http.post<{ data: { systemPrompt: string; userPrompt: string; model: string; configured: boolean } }>(`${this.apiUrl}/ai/debug-prompt`, context).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Debug prompt preview error:', error);
        return of({ systemPrompt: 'Error fetching prompt', userPrompt: 'Error fetching prompt', model: 'unknown', configured: false });
      })
    );
  }

  /**
   * Fetch technical resource content for a given folder path.
   * Returns the extracted text content from all files in that folder.
   */
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

  /**
   * Review a completed document for professionalism and completeness.
   * Returns a rating (1-10) and specific improvement suggestions.
   */
  reviewDocument(documentContent: string, assessmentType: string, customerName: string): Observable<AIDocumentReviewResponse> {
    return this.http.post<{ data: AIDocumentReviewResponse }>(`${this.apiUrl}/ai/review`, {
      documentContent,
      assessmentType,
      customerName,
    }).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('AI document review error:', error);
        const detail = error?.error?.message || error?.message || 'Unknown error';
        return of({
          rating: 0,
          suggestions: [`Professional review failed: ${detail}`],
          summary: 'Review could not be completed.',
        });
      })
    );
  }

  /**
   * Template-based fallback when the backend AI service is unavailable
   */
  private generateFallbackContent(customerName: string, assessmentType: string, referenceArchitecture: string): string {
    return `This ${assessmentType} provides a comprehensive evaluation of ${customerName}'s ${referenceArchitecture} environment.

Our team will conduct a thorough analysis to:

• Assess current state and capabilities
• Identify areas for improvement
• Evaluate risks and challenges
• Provide actionable recommendations
• Develop a strategic improvement roadmap

The assessment delivers ${customerName} with clear insights and a prioritized plan for achieving their technology objectives.`;
  }
}
