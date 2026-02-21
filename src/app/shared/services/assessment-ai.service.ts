import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AIGenerationRequest {
  prompt: string;
  customerName: string;
  referenceArchitecture: string;
  assessmentType: string;
  context?: string;
}

export interface AIGenerationResponse {
  generated: boolean;
  content: string;
  tokens?: number;
}

/**
 * AI Service for generating personalized assessment content.
 * 
 * This service provides methods to generate AI-powered content for assessments.
 * Currently implements a template-based approach with placeholder replacement.
 * 
 * Future Enhancement: Integrate with OpenAI, Azure OpenAI, or other LLM providers
 * by adding API calls in the generateContent method.
 */
@Injectable({
  providedIn: 'root'
})
export class AssessmentAIService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Generate personalized content based on a prompt and context.
   * 
   * This method can be extended to call an external AI API (OpenAI, Azure OpenAI, etc.)
   * Currently uses template-based generation with intelligent placeholder replacement.
   */
  generateContent(request: AIGenerationRequest): Observable<AIGenerationResponse> {
    // For now, return enhanced template-based content
    // In production, this would call an AI API
    const content = this.generateTemplateContent(request);
    
    return of({
      generated: true,
      content,
      tokens: content.length // Placeholder for actual token count
    }).pipe(delay(500)); // Simulate AI processing time
  }

  /**
   * Generate an executive summary for an assessment.
   */
  generateExecutiveSummary(
    customerName: string,
    assessmentType: string,
    referenceArchitecture: string,
    aiPrompt?: string
  ): Observable<string> {
    const request: AIGenerationRequest = {
      prompt: aiPrompt || this.getDefaultSummaryPrompt(assessmentType),
      customerName,
      referenceArchitecture,
      assessmentType
    };

    return this.generateContent(request).pipe(map(r => r.content));
  }

  /**
   * Generate findings section for an assessment.
   */
  generateFindings(
    customerName: string,
    assessmentType: string,
    referenceArchitecture: string,
    aiPrompt?: string
  ): Observable<string> {
    const request: AIGenerationRequest = {
      prompt: aiPrompt || this.getDefaultFindingsPrompt(assessmentType),
      customerName,
      referenceArchitecture,
      assessmentType
    };

    return this.generateContent(request).pipe(map(r => r.content));
  }

  /**
   * Generate recommendations for an assessment.
   */
  generateRecommendations(
    customerName: string,
    assessmentType: string,
    referenceArchitecture: string,
    aiPrompt?: string
  ): Observable<string> {
    const request: AIGenerationRequest = {
      prompt: aiPrompt || this.getDefaultRecommendationsPrompt(assessmentType),
      customerName,
      referenceArchitecture,
      assessmentType
    };

    return this.generateContent(request).pipe(map(r => r.content));
  }

  /**
   * Template-based content generation with smart placeholder replacement.
   * This provides reasonable default content that can be customized.
   */
  private generateTemplateContent(request: AIGenerationRequest): string {
    const { prompt, customerName, referenceArchitecture, assessmentType } = request;
    
    // Process the prompt with placeholders
    let content = prompt
      .replace(/\{customerName\}/gi, customerName)
      .replace(/\{referenceArchitecture\}/gi, referenceArchitecture)
      .replace(/\{assessmentType\}/gi, assessmentType);

    // If no prompt provided, generate default content based on assessment type
    if (!prompt || prompt.trim() === '') {
      content = this.generateDefaultContent(customerName, assessmentType, referenceArchitecture);
    }

    return content;
  }

  private generateDefaultContent(customerName: string, assessmentType: string, referenceArchitecture: string): string {
    const type = assessmentType.toLowerCase();
    
    if (type.includes('security')) {
      return this.generateSecurityContent(customerName, referenceArchitecture);
    } else if (type.includes('infrastructure')) {
      return this.generateInfrastructureContent(customerName, referenceArchitecture);
    } else if (type.includes('cloud')) {
      return this.generateCloudContent(customerName, referenceArchitecture);
    } else if (type.includes('compliance')) {
      return this.generateComplianceContent(customerName, referenceArchitecture);
    } else if (type.includes('network')) {
      return this.generateNetworkContent(customerName, referenceArchitecture);
    }
    
    return this.generateGenericContent(customerName, assessmentType, referenceArchitecture);
  }

  private generateSecurityContent(customerName: string, architecture: string): string {
    return `This Security Assessment provides a comprehensive evaluation of ${customerName}'s current security posture across their ${architecture} environment.

Our team conducted a thorough analysis of security controls, policies, and configurations to identify potential vulnerabilities and areas for improvement. The assessment covered:

• Access Management and Identity Controls
• Network Security Architecture
• Data Protection and Encryption
• Endpoint Security Measures
• Incident Response Capabilities
• Security Monitoring and Logging

Key focus areas include evaluating the effectiveness of existing security controls, identifying gaps in protection, and providing actionable recommendations to strengthen ${customerName}'s overall security posture.`;
  }

  private generateInfrastructureContent(customerName: string, architecture: string): string {
    return `This Infrastructure Assessment evaluates ${customerName}'s ${architecture} environment to identify optimization opportunities, capacity constraints, and modernization paths.

Our comprehensive review covers:

• Server Infrastructure and Virtualization
• Storage Systems and Data Management
• Network Architecture and Connectivity
• Disaster Recovery and Business Continuity
• Performance and Capacity Planning
• Infrastructure Lifecycle Management

The assessment provides ${customerName} with a clear understanding of their current infrastructure state, identifies technical debt, and outlines a strategic roadmap for infrastructure improvements.`;
  }

  private generateCloudContent(customerName: string, architecture: string): string {
    return `This Cloud Readiness Assessment evaluates ${customerName}'s preparedness for migrating to or expanding their ${architecture} cloud environment.

Our evaluation encompasses:

• Application Portfolio Analysis
• Workload Classification and Dependencies
• Cloud Cost Modeling and TCO Analysis
• Security and Compliance Considerations
• Skills and Organizational Readiness
• Migration Strategy and Planning

The assessment will help ${customerName} understand their cloud readiness maturity, identify potential challenges, and develop a strategic approach to cloud adoption.`;
  }

  private generateComplianceContent(customerName: string, architecture: string): string {
    return `This Compliance Assessment evaluates ${customerName}'s ${architecture} environment against applicable regulatory and compliance requirements.

Our assessment methodology includes:

• Policy and Procedure Documentation Review
• Technical Controls Evaluation
• Access Control and Identity Management
• Data Handling and Privacy Practices
• Audit Logging and Monitoring
• Incident Response Procedures

The assessment maps ${customerName}'s current controls to compliance requirements, identifies gaps, and provides a prioritized remediation roadmap.`;
  }

  private generateNetworkContent(customerName: string, architecture: string): string {
    return `This Network Assessment provides a detailed analysis of ${customerName}'s network infrastructure supporting their ${architecture} environment.

Our evaluation covers:

• Network Topology and Architecture
• Switching and Routing Infrastructure
• Wireless Network Configuration
• Firewall and Security Controls
• Network Performance and Bandwidth
• Network Monitoring and Management

The assessment identifies optimization opportunities, security improvements, and provides recommendations for network modernization.`;
  }

  private generateGenericContent(customerName: string, assessmentType: string, architecture: string): string {
    return `This ${assessmentType} provides a comprehensive evaluation of ${customerName}'s ${architecture} environment.

Our team will conduct a thorough analysis to:

• Assess current state and capabilities
• Identify areas for improvement
• Evaluate risks and challenges
• Provide actionable recommendations
• Develop a strategic improvement roadmap

The assessment delivers ${customerName} with clear insights and a prioritized plan for achieving their technology objectives.`;
  }

  private getDefaultSummaryPrompt(assessmentType: string): string {
    return `Generate a professional executive summary for a ${assessmentType} of {customerName} focusing on {referenceArchitecture}. Highlight key concerns and business impact.`;
  }

  private getDefaultFindingsPrompt(assessmentType: string): string {
    return `Document ${assessmentType} findings categorized by risk level (Critical, High, Medium, Low). Provide specific technical details and business context for {customerName}'s {referenceArchitecture} environment.`;
  }

  private getDefaultRecommendationsPrompt(assessmentType: string): string {
    return `Generate prioritized ${assessmentType} recommendations for {customerName} with estimated effort, cost, and timeline. Focus on quick wins and long-term improvements for their {referenceArchitecture} environment.`;
  }
}
